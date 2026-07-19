package com.brewdesk.app.auth.dto;

import com.brewdesk.app.staff.Role;
import com.brewdesk.app.staff.User;
import java.util.UUID;

/** Thông tin tài khoản trả ra ngoài — không bao giờ chứa password_hash. */
public record UserResponse(
        UUID id,
        String username,
        String fullName,
        Role role,
        boolean active,
        boolean mustChangePassword) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                user.isActive(),
                user.isMustChangePassword());
    }
}
