package com.brewdesk.app.staff.dto;

import com.brewdesk.app.staff.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Sửa họ tên hiển thị và vai trò của một nhân viên. Không đổi tên đăng nhập. */
public record UpdateStaffRequest(
        @NotBlank(message = "Chưa nhập họ tên")
                @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
                String fullName,
        @NotNull(message = "Chưa chọn vai trò") Role role) {}
