package com.brewdesk.app.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Chưa nhập tên đăng nhập") String username,
        @NotBlank(message = "Chưa nhập mật khẩu") String password) {}
