package com.brewdesk.app.staff.dto;

import com.brewdesk.app.staff.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateStaffRequest(
        @NotBlank(message = "Chưa nhập tên đăng nhập")
                @Size(max = 50, message = "Tên đăng nhập tối đa 50 ký tự")
                @Pattern(
                        regexp = "^[a-zA-Z0-9_.]+$",
                        message = "Tên đăng nhập chỉ gồm chữ, số, dấu chấm và gạch dưới")
                String username,
        @NotBlank(message = "Chưa nhập họ tên")
                @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
                String fullName,
        @NotNull(message = "Chưa chọn vai trò") Role role,
        @NotBlank(message = "Chưa nhập mật khẩu khởi tạo")
                @Size(min = 8, message = "Mật khẩu khởi tạo phải từ 8 ký tự trở lên")
                String initialPassword) {}
