package com.brewdesk.app.auth;

import com.brewdesk.app.auth.dto.ChangePasswordRequest;
import com.brewdesk.app.auth.dto.LoginRequest;
import com.brewdesk.app.auth.dto.RefreshRequest;
import com.brewdesk.app.auth.dto.TokenResponse;
import com.brewdesk.app.auth.dto.UserResponse;
import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.staff.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Xác thực")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;

    @Operation(summary = "Đăng nhập")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }

    @Operation(summary = "Cấp lại access token bằng refresh token")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refresh(request)));
    }

    @Operation(summary = "Đổi mật khẩu của chính mình")
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đổi mật khẩu thành công"));
    }

    @Operation(summary = "Thông tin tài khoản đang đăng nhập")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        var user =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        return ResponseEntity.ok(ApiResponse.ok(UserResponse.from(user)));
    }
}
