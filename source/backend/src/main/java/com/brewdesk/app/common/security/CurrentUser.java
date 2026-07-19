package com.brewdesk.app.common.security;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Lấy người đang đăng nhập từ SecurityContext. */
public final class CurrentUser {

    private CurrentUser() {}

    public static Optional<UserPrincipal> find() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
            return Optional.empty();
        }
        return Optional.of(principal);
    }

    public static UserPrincipal require() {
        return find().orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    public static Optional<UUID> findId() {
        return find().map(UserPrincipal::getId);
    }
}
