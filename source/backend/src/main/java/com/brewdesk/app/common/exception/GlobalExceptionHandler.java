package com.brewdesk.app.common.exception;

import com.brewdesk.app.common.dto.ApiResponse;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
// Spring Boot 4 dùng Jackson 3 — package tools.jackson.*, không phải com.fasterxml.
// Jackson 3 cũng đổi tên: JsonMappingException.Reference nay là JacksonException.Reference.
import tools.jackson.core.JacksonException.Reference;
import tools.jackson.databind.exc.InvalidFormatException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
        ErrorCode code = ex.getErrorCode();
        return ResponseEntity.status(code.getStatus())
                .body(ApiResponse.error(ex.getMessage(), code.name()));
    }

    /** Gom lỗi @Valid thành một câu tiếng Việt để hiện thẳng lên giao diện. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(err -> err.getField() + ": " + err.getDefaultMessage())
                        .collect(Collectors.joining("; "));
        ErrorCode code = ErrorCode.VALIDATION_ERROR;
        return ResponseEntity.status(code.getStatus())
                .body(
                        ApiResponse.error(
                                message.isBlank() ? code.getDefaultMessage() : message, code.name()));
    }

    /**
     * Body không đọc được: JSON sai cú pháp, hoặc phổ biến hơn là giá trị enum lạ
     * ({@code "frequency":"HANG_GIO"}, {@code "paymentMethod":"MOMO"}).
     *
     * <p>Không có handler này thì mọi trường hợp trên rơi vào bắt-tất-cả và trả
     * 500, tức lỗi của client bị báo thành lỗi hệ thống — người dùng thấy "Lỗi hệ
     * thống, thử lại sau" và thử lại mãi không được. Lỗi này có từ Phase 2 nhưng
     * chỉ lộ khi Phase 6 test giá trị enum sai.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(
            HttpMessageNotReadableException ex) {
        ErrorCode code = ErrorCode.VALIDATION_ERROR;
        return ResponseEntity.status(code.getStatus())
                .body(ApiResponse.error(describe(ex), code.name()));
    }

    /** Tham số trên URL sai kiểu, ví dụ {@code ?shiftTypeId=abc} cho một UUID. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {
        ErrorCode code = ErrorCode.VALIDATION_ERROR;
        return ResponseEntity.status(code.getStatus())
                .body(
                        ApiResponse.error(
                                "Giá trị không hợp lệ cho tham số " + ex.getName(), code.name()));
    }

    /**
     * Chỉ nói tên trường và các giá trị hợp lệ. Không ghép nguyên thông báo của
     * Jackson vào response vì nó lộ tên class Java ra ngoài.
     */
    private static String describe(HttpMessageNotReadableException ex) {
        if (!(ex.getCause() instanceof InvalidFormatException cause)) {
            return "Dữ liệu gửi lên không đọc được";
        }

        String field =
                cause.getPath().stream()
                        .map(Reference::getPropertyName)
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.joining("."));
        String where = field.isBlank() ? "Dữ liệu" : "Trường " + field;

        Class<?> target = cause.getTargetType();
        if (target != null && target.isEnum()) {
            String accepted =
                    java.util.Arrays.stream(target.getEnumConstants())
                            .map(Object::toString)
                            .collect(Collectors.joining(", "));
            return "%s có giá trị không hợp lệ. Chỉ nhận: %s".formatted(where, accepted);
        }
        return where + " có giá trị không hợp lệ";
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        ErrorCode code = ErrorCode.FORBIDDEN;
        return ResponseEntity.status(code.getStatus())
                .body(ApiResponse.error(code.getDefaultMessage(), code.name()));
    }

    /** Lỗi ngoài dự kiến: ghi log đầy đủ nhưng không lộ chi tiết ra client. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Lỗi không lường trước", ex);
        ErrorCode code = ErrorCode.INTERNAL_ERROR;
        return ResponseEntity.status(code.getStatus())
                .body(ApiResponse.error(code.getDefaultMessage(), code.name()));
    }
}
