package com.brewdesk.app.staff.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * ADMIN cấp lại mật khẩu tạm cho nhân viên. Sau khi đổi, tài khoản bị bắt đổi
 * mật khẩu ở lần đăng nhập kế tiếp — admin chỉ biết mật khẩu tạm, không biết
 * mật khẩu thật của nhân viên.
 */
public record ResetStaffPasswordRequest(
        @NotBlank(message = "Chưa nhập mật khẩu tạm")
                @Size(min = 8, message = "Mật khẩu tạm phải từ 8 ký tự trở lên")
                String newPassword) {}
