package com.billwise.backend.dto;

import com.billwise.backend.entity.Role;
import com.billwise.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StaffUserResponse {

    private String id;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private Role role;
    private boolean enabled;
    private Instant createdAt;

    public static StaffUserResponse fromEntity(User u) {
        if (u == null) return null;
        return new StaffUserResponse(
                u.getId(),
                u.getUsername(),
                u.getFullName(),
                u.getEmail(),
                u.getPhone(),
                u.getRole(),
                u.isEnabled(),
                u.getCreatedAt()
        );
    }
}
