package com.brewdesk.app.common.security;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Lỗi phát sinh trong filter chain xảy ra trước khi tới controller nên
 * GlobalExceptionHandler không bắt được — phải tự ghi JSON đúng format ở đây,
 * nếu không client sẽ nhận trang lỗi HTML mặc định của Spring.
 *
 * <p>Dùng ObjectMapper của Jackson 3 (`tools.jackson`) vì đó là bản Spring Boot 4
 * tạo bean. Jackson 2 (`com.fasterxml.jackson`) cũng có trên classpath do jjwt và
 * springdoc kéo về nhưng không có bean nào.
 */
@Component
@RequiredArgsConstructor
public class SecurityResponseWriter {

    private final ObjectMapper objectMapper;

    public void write(HttpServletResponse response, ErrorCode errorCode) throws IOException {
        write(response, errorCode, errorCode.getDefaultMessage());
    }

    public void write(HttpServletResponse response, ErrorCode errorCode, String message)
            throws IOException {
        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(
                response.getOutputStream(), ApiResponse.error(message, errorCode.name()));
    }
}
