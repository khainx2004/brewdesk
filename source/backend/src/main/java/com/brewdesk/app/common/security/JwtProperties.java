package com.brewdesk.app.common.security;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Cấu hình JWT đọc từ biến môi trường.
 *
 * <p>Ràng buộc ở đây cố ý làm app chết ngay lúc khởi động nếu thiếu hoặc yếu, thay
 * vì chạy được rồi phát hành token ký bằng khoá đoán ra dễ dàng.
 */
@Validated
@ConfigurationProperties(prefix = "brewdesk.jwt")
public record JwtProperties(
        @NotNull
                @Size(
                        min = 32,
                        message =
                                "JWT_SECRET phải dài tối thiểu 32 ký tự. Sinh bằng: openssl rand -base64 48")
                String secret,
        @NotNull Duration accessTokenTtl,
        @NotNull Duration refreshTokenTtl) {}
