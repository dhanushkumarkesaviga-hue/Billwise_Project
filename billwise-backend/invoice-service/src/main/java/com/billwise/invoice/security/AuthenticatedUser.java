package com.billwise.invoice.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.security.Principal;

@Getter
@AllArgsConstructor
public class AuthenticatedUser implements Principal {

    private final String username;
    private final String role;
    private final String merchantId;

    @Override
    public String getName() {
        return username;
    }

    public boolean isSuperAdmin() {
        return "SUPER_ADMIN".equalsIgnoreCase(role);
    }
}
