package com.billwise.auth.security;

import com.billwise.auth.entity.Merchant;
import com.billwise.auth.entity.User;
import com.billwise.auth.repository.MerchantRepository;
import com.billwise.auth.repository.UserRepository;
import com.billwise.common.security.JwtUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@Slf4j
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final JwtUtils jwtUtils;

    @Value("${billwise.oauth2.frontend-redirect-uri:http://localhost:3000}")
    private String frontendRedirectUri;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        if (!(authentication.getPrincipal() instanceof OAuth2User oAuth2User)) {
            super.onAuthenticationSuccess(request, response, authentication);
            return;
        }

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");
        String sub = oAuth2User.getAttribute("sub");

        if (email == null || email.isBlank()) {
            log.warn("OAuth2 login failed: No email attribute provided by Google.");
            String errorUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
                    .queryParam("error", "Google did not provide a verified email address.")
                    .build().toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorUrl);
            return;
        }

        email = email.trim().toLowerCase();
        log.info("Processing Google OAuth2 sign-in for verified email: {}", email);

        User existingUser = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (existingUser != null) {
            // Check account status
            if (!existingUser.isEnabled()) {
                String errorUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
                        .queryParam("error", "Your account has been deactivated by the system.")
                        .build().toUriString();
                getRedirectStrategy().sendRedirect(request, response, errorUrl);
                return;
            }

            // Sync Google ID and avatar if missing
            boolean needsSave = false;
            if (existingUser.getGoogleId() == null && sub != null) {
                existingUser.setGoogleId(sub);
                needsSave = true;
            }
            if ((existingUser.getProfilePhotoUrl() == null || existingUser.getProfilePhotoUrl().isBlank()) && picture != null) {
                existingUser.setProfilePhotoUrl(picture);
                needsSave = true;
            }
            if (needsSave) {
                userRepository.save(existingUser);
            }

            // Generate standard JWT token with same claims & shape as password login
            String token = jwtUtils.generateToken(
                    existingUser.getUsername(),
                    existingUser.getRole().name(),
                    existingUser.getMerchantId()
            );

            log.info("✅ [GOOGLE OAUTH LOGIN] Authenticated existing user [{}] (role: {}) via Google",
                    existingUser.getUsername(), existingUser.getRole());

            String targetUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
                    .queryParam("oauth_token", token)
                    .queryParam("username", existingUser.getUsername())
                    .queryParam("email", existingUser.getEmail())
                    .queryParam("fullName", existingUser.getFullName())
                    .queryParam("role", existingUser.getRole().name())
                    .queryParam("merchantId", existingUser.getMerchantId() != null ? existingUser.getMerchantId() : "")
                    .build().toUriString();

            getRedirectStrategy().sendRedirect(request, response, targetUrl);

        } else {
            // Guardrail: DO NOT auto-create active Admin. Route to standard MerchantSignup flow
            log.info("ℹ️ [NEW GOOGLE USER] Email [{}] not registered. Directing to MerchantSignup KYC flow.", email);

            String targetUrl = UriComponentsBuilder.fromUriString(frontendRedirectUri)
                    .queryParam("oauth_new_user", "true")
                    .queryParam("email", email)
                    .queryParam("name", name != null ? name : "")
                    .queryParam("emailVerified", "true")
                    .build().toUriString();

            getRedirectStrategy().sendRedirect(request, response, targetUrl);
        }
    }
}
