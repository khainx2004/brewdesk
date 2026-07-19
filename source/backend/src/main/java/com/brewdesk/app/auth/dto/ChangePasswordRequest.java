package com.brewdesk.app.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Chưa nhập mật khẩu hiện tại") String currentPassword,
        @NotBlank(message = "Chưa nhập mật khẩu mới")
                @Size(min = 8, message = "Mật khẩu mới phải từ 8 ký tự trở lên")
                String newPassword) {}
