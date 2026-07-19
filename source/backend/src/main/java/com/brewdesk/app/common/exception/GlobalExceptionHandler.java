package com.brewdesk.app.common.exception;

import com.brewdesk.app.common.dto.ApiResponse;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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
