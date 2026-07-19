package com.brewdesk.app.auth;

import com.brewdesk.app.auth.dto.ChangePasswordRequest;
import com.brewdesk.app.auth.dto.LoginRequest;
import com.brewdesk.app.auth.dto.RefreshRequest;
import com.brewdesk.app.auth.dto.TokenResponse;
import com.brewdesk.app.auth.dto.UserResponse;
import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.common.security.JwtService;
import com.brewdesk.app.common.security.TokenType;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        User user =
                userRepository
                        .findByUsername(request.username())
                        // Cùng một lỗi cho cả sai tên lẫn sai mật khẩu, để không lộ
                        // tài khoản nào đang tồn tại.
                        .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!user.isActive()) {
            throw new AppException(ErrorCode.ACCOUNT_DISABLED);
        }

        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse refresh(RefreshRequest request) {
        UUID userId = jwtService.parseUserId(request.refreshToken(), TokenType.REFRESH);
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.TOKEN_INVALID));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.ACCOUNT_DISABLED);
        }

        return issueTokens(user);
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        UUID userId = CurrentUser.require().getId();
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_WRONG);
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.PASSWORD_SAME_AS_OLD);
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        // Ghi nhận việc đổi, tuyệt đối không ghi nội dung mật khẩu.
        auditService.record("CHANGE_PASSWORD", "users", user.getId());
    }

    private TokenResponse issueTokens(User user) {
        return new TokenResponse(
                jwtService.issueAccessToken(user),
                jwtService.issueRefreshToken(user),
                jwtService.accessTokenTtlSeconds(),
                UserResponse.from(user));
    }
}
