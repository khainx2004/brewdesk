package com.brewdesk.app.staff;

import com.brewdesk.app.auth.dto.UserResponse;
import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.staff.dto.CreateStaffRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Quản lý nhân viên")
@RestController
@RequestMapping("/api/v1/admin/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @Operation(summary = "Tạo tài khoản nhân viên (chỉ ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(staffService.create(request), "Tạo tài khoản thành công"));
    }
}
