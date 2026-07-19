package com.brewdesk.app.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/** Mã lỗi trả về cho client ở trường errorCode. Client dựa vào mã, không dựa vào message. */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // Xác thực
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không đúng"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "Tài khoản đã bị vô hiệu hoá"),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ"),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "Cần đăng nhập để thực hiện thao tác này"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này"),
    MUST_CHANGE_PASSWORD(HttpStatus.FORBIDDEN, "Cần đổi mật khẩu trước khi dùng tiếp"),

    // Mật khẩu
    CURRENT_PASSWORD_WRONG(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng"),
    PASSWORD_SAME_AS_OLD(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu cũ"),

    // Tài khoản
    USERNAME_EXISTS(HttpStatus.CONFLICT, "Tên đăng nhập đã tồn tại"),

    // Chung
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, thử lại sau");

    private final HttpStatus status;
    private final String defaultMessage;
}
