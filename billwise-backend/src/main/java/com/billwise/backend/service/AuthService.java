package com.billwise.backend.service;

import com.billwise.backend.dto.AuthResponse;
import com.billwise.backend.dto.LoginRequest;
import com.billwise.backend.dto.RegisterRequest;
import com.billwise.backend.entity.Merchant;
import com.billwise.backend.entity.Role;
import com.billwise.backend.entity.User;
import com.billwise.backend.exception.BadRequestException;
import com.billwise.backend.repository.MerchantRepository;
import com.billwise.backend.repository.UserRepository;
import com.billwise.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final MerchantRepository merchantRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        Role role = parseRole(request.getRole());

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
        } catch (BadCredentialsException ex) {
            throw new BadRequestException("Invalid username or password");
        }

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        String merchantStatus = "VERIFIED";
        String merchantTradeName = null;

        if (user.getMerchantId() != null) {
            Merchant m = merchantRepository.findById(user.getMerchantId()).orElse(null);
            if (m != null) {
                merchantStatus = m.getStatus().name();
                merchantTradeName = m.getTradeName();
            }
        }

        return new AuthResponse(
                token,
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getFullName(),
                user.getMerchantId(),
                merchantStatus,
                merchantTradeName,
                jwtUtil.getExpirationMs()
        );
    }

    private Role parseRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isBlank()) {
            return Role.VIEWER;
        }
        try {
            return Role.valueOf(requestedRole.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid role. Must be one of: SUPER_ADMIN, ADMIN, ACCOUNTANT, VIEWER");
        }
    }
}
