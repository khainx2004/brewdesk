package com.brewdesk.app.common.security;

import com.brewdesk.app.staff.User;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** Bọc User để Spring Security dùng, đồng thời mang sẵn id và cờ đổi mật khẩu. */
@Getter
public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String username;
    private final String passwordHash;
    private final boolean active;
    private final boolean mustChangePassword;
    private final List<GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.passwordHash = user.getPasswordHash();
        this.active = user.isActive();
        this.mustChangePassword = user.isMustChangePassword();
        // Spring Security quy ước prefix ROLE_ cho hasRole()
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
