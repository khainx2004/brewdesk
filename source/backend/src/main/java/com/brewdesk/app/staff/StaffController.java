package com.brewdesk.app.staff;

import com.brewdesk.app.auth.dto.UserResponse;
import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.staff.dto.CreateStaffRequest;
import com.brewdesk.app.staff.dto.ResetStaffPasswordRequest;
import com.brewdesk.app.staff.dto.UpdateStaffRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Quản lý nhân viên")
@RestController
@RequestMapping("/api/v1/admin/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @Operation(
            summary = "Danh sách nhân viên (chỉ ADMIN)",
            description =
                    "Mặc định chỉ người đang hoạt động. includeInactive=true kèm cả người đã khoá"
                        + " cho màn Quản lý nhân viên.")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.list(includeInactive)));
    }

    @Operation(summary = "Tạo tài khoản nhân viên (chỉ ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(staffService.create(request), "Tạo tài khoản thành công"));
    }

    @Operation(summary = "Sửa họ tên và vai trò nhân viên (chỉ ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody UpdateStaffRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.update(id, request), "Đã cập nhật"));
    }

    @Operation(summary = "Khoá tài khoản — nghỉ việc (chỉ ADMIN)")
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.deactivate(id), "Đã khoá tài khoản"));
    }

    @Operation(summary = "Mở lại tài khoản đã khoá (chỉ ADMIN)")
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.activate(id), "Đã mở lại tài khoản"));
    }

    @Operation(summary = "Cấp lại mật khẩu tạm cho nhân viên (chỉ ADMIN)")
    @PatchMapping("/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> resetPassword(
            @PathVariable UUID id, @Valid @RequestBody ResetStaffPasswordRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        staffService.resetPassword(id, request),
                        "Đã cấp mật khẩu tạm, nhân viên phải đổi khi đăng nhập"));
    }
}
