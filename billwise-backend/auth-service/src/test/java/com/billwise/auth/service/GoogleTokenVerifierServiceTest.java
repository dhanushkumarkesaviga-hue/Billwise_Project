package com.billwise.auth.service;

import com.billwise.common.exception.BadRequestException;
import com.billwise.common.exception.UnauthorizedException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.security.GeneralSecurityException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleTokenVerifierServiceTest {

    private GoogleTokenVerifierService verifierService;

    @Mock
    private GoogleIdTokenVerifier mockVerifier;

    @BeforeEach
    void setUp() {
        verifierService = new GoogleTokenVerifierService();
        verifierService.setVerifier(mockVerifier);
    }

    @Test
    @DisplayName("Successfully verifies a valid Google ID token with email_verified=true")
    void testVerifyToken_Success() throws GeneralSecurityException, IOException {
        String tokenStr = "valid.google.idtoken.jwt";

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("verified.merchant@gmail.com");
        payload.setEmailVerified(true);
        payload.set("name", "Verified Merchant");
        payload.set("picture", "https://example.com/avatar.jpg");
        payload.setSubject("google_sub_109823091823");

        GoogleIdToken idToken = mock(GoogleIdToken.class);
        when(idToken.getPayload()).thenReturn(payload);
        when(mockVerifier.verify(tokenStr)).thenReturn(idToken);

        GoogleIdToken.Payload result = verifierService.verifyToken(tokenStr);

        assertNotNull(result);
        assertEquals("verified.merchant@gmail.com", result.getEmail());
        assertTrue(result.getEmailVerified());
        assertEquals("Verified Merchant", result.get("name"));
        assertEquals("google_sub_109823091823", result.getSubject());
    }

    @Test
    @DisplayName("Rejects null, empty, or blank Google ID token strings with BadRequestException")
    void testVerifyToken_NullOrBlank() {
        assertThrows(BadRequestException.class, () -> verifierService.verifyToken(null));
        assertThrows(BadRequestException.class, () -> verifierService.verifyToken(""));
        assertThrows(BadRequestException.class, () -> verifierService.verifyToken("   "));
    }

    @Test
    @DisplayName("Rejects forged or invalid tokens where cryptographic signature check fails")
    void testVerifyToken_ForgedOrInvalid() throws GeneralSecurityException, IOException {
        String fakeToken = "fake.forged.jwt";
        when(mockVerifier.verify(fakeToken)).thenReturn(null);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> verifierService.verifyToken(fakeToken));
        assertTrue(ex.getMessage().contains("Invalid or forged ID token"));
    }

    @Test
    @DisplayName("Rejects token if Google reports email_verified is false")
    void testVerifyToken_EmailNotVerified() throws GeneralSecurityException, IOException {
        String tokenStr = "unverified.email.token";

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmail("unverified@gmail.com");
        payload.setEmailVerified(false);

        GoogleIdToken idToken = mock(GoogleIdToken.class);
        when(idToken.getPayload()).thenReturn(payload);
        when(mockVerifier.verify(tokenStr)).thenReturn(idToken);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> verifierService.verifyToken(tokenStr));
        assertTrue(ex.getMessage().contains("not verified by Google"));
    }

    @Test
    @DisplayName("Rejects token if email claim is missing or empty")
    void testVerifyToken_MissingEmail() throws GeneralSecurityException, IOException {
        String tokenStr = "no.email.token";

        GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
        payload.setEmailVerified(true);
        payload.setEmail(null);

        GoogleIdToken idToken = mock(GoogleIdToken.class);
        when(idToken.getPayload()).thenReturn(payload);
        when(mockVerifier.verify(tokenStr)).thenReturn(idToken);

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> verifierService.verifyToken(tokenStr));
        assertTrue(ex.getMessage().contains("valid email address"));
    }

    @Test
    @DisplayName("Wraps network or certificate verification exceptions in UnauthorizedException")
    void testVerifyToken_CryptoException() throws GeneralSecurityException, IOException {
        String tokenStr = "error.token";
        when(mockVerifier.verify(tokenStr)).thenThrow(new GeneralSecurityException("Certificate parsing failure"));

        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () -> verifierService.verifyToken(tokenStr));
        assertTrue(ex.getMessage().contains("verification error"));
    }
}
