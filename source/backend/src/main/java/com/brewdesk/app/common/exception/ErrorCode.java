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
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"),
    CANNOT_DEACTIVATE_SELF(HttpStatus.BAD_REQUEST, "Không thể tự khoá tài khoản của chính mình"),
    CANNOT_CHANGE_OWN_ROLE(HttpStatus.BAD_REQUEST, "Không thể tự đổi vai trò của chính mình"),
    LAST_ADMIN(HttpStatus.BAD_REQUEST, "Phải còn ít nhất một quản lý đang hoạt động"),

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
    INGREDIENT_IN_RECIPE(
            HttpStatus.CONFLICT,
            "Nguyên liệu đang nằm trong công thức của món, cần gỡ khỏi công thức trước"),
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

    // POS
    ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng"),
    ORDER_EMPTY(HttpStatus.BAD_REQUEST, "Đơn hàng chưa có món nào"),
    ORDER_ALREADY_CANCELLED(HttpStatus.CONFLICT, "Đơn hàng đã bị huỷ trước đó"),
    MENU_ITEM_INACTIVE(HttpStatus.BAD_REQUEST, "Món đang ngừng bán"),
    MENU_ITEM_NO_RECIPE(
            HttpStatus.BAD_REQUEST,
            "Món chưa có công thức nguyên liệu nên không bán được, cần khai công thức trước"),
    STOCK_NOT_ENOUGH(HttpStatus.CONFLICT, "Không đủ nguyên liệu trong kho"),
    DISCOUNT_EXCEEDS_SUBTOTAL(HttpStatus.BAD_REQUEST, "Giảm giá không được vượt quá tiền hàng"),
    VARIANT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy mức ngọt hoặc mức đá"),
    VARIANT_TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "Chọn nhầm loại mức ngọt / mức đá"),

    // Checklist
    CHECKLIST_TEMPLATE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy đầu việc"),
    CHECKLIST_TEMPLATE_INACTIVE(HttpStatus.BAD_REQUEST, "Đầu việc đang ngừng áp dụng"),
    CHECKLIST_TITLE_EXISTS(HttpStatus.CONFLICT, "Đã có đầu việc trùng tên"),
    CHECKLIST_ALREADY_DONE(HttpStatus.CONFLICT, "Đầu việc này đã được tick rồi"),
    CHECKLIST_COMPLETION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy lượt tick"),

    // QC test cafe
    QC_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy phiên test cafe"),
    QC_TESTS_EMPTY(HttpStatus.BAD_REQUEST, "Phiên test chưa có lần test nào"),
    STOCK_IMPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu nhập kho"),

    // Ca làm việc
    SHIFT_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy ca làm việc"),
    SHIFT_REQUIRED(
            HttpStatus.BAD_REQUEST,
            "Đang ngoài giờ hoạt động nên không tự xác định được ca, cần chọn ca"),

    // Bàn giao ca
    RECONCILIATION_NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy bàn giao ca này"),
    RECONCILIATION_EXISTS(HttpStatus.CONFLICT, "Ca này trong ngày đã chốt rồi"),

    // Chung
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy dữ liệu"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi hệ thống, thử lại sau");

    private final HttpStatus status;
    private final String defaultMessage;
}
