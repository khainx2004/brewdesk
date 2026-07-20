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

    // Menu
    CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"),
    CATEGORY_NAME_EXISTS(HttpStatus.CONFLICT, "Tên danh mục đã tồn tại"),
    CATEGORY_INACTIVE(HttpStatus.BAD_REQUEST, "Danh mục đang ngừng hoạt động"),
    CATEGORY_HAS_ACTIVE_ITEMS(
            HttpStatus.CONFLICT, "Danh mục còn món đang bán, cần ngừng bán các món đó trước"),
    MENU_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy món"),
    MENU_ITEM_NAME_EXISTS(HttpStatus.CONFLICT, "Danh mục này đã có món trùng tên"),

    // Kho
    INGREDIENT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy nguyên liệu"),
    INGREDIENT_NAME_EXISTS(HttpStatus.CONFLICT, "Tên nguyên liệu đã tồn tại"),
    INGREDIENT_INACTIVE(HttpStatus.BAD_REQUEST, "Nguyên liệu đang ngừng sử dụng"),
    SUPPLIER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy nhà cung cấp"),
    SUPPLIER_NAME_EXISTS(HttpStatus.CONFLICT, "Tên nhà cung cấp đã tồn tại"),
    UNIT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy đơn vị tính"),
    INGREDIENT_CATEGORY_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy nhóm nguyên liệu"),
    UNIT_NOT_CONVERTIBLE(
            HttpStatus.BAD_REQUEST,
            "Không quy đổi được giữa hai đơn vị này vì chúng không cùng hệ đo"),
    STOCK_TAKE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu kiểm kê"),
    STOCK_TAKE_ALREADY_COMPLETED(
            HttpStatus.CONFLICT, "Phiếu kiểm kê đã chốt, không sửa được nữa"),
    STOCK_TAKE_LINE_DUPLICATED(
            HttpStatus.CONFLICT, "Nguyên liệu này đã có trong phiếu kiểm kê"),
    STOCK_TAKE_EMPTY(HttpStatus.BAD_REQUEST, "Phiếu kiểm kê chưa có dòng nào để chốt"),

    // Chung
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, thử lại sau");

    private final HttpStatus status;
    private final String defaultMessage;
}
