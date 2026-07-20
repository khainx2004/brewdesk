package com.brewdesk.app.inventory;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.inventory.dto.SupplierRequest;
import com.brewdesk.app.inventory.dto.SupplierResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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

@Tag(name = "Nhà cung cấp")
@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @Operation(summary = "Danh sách nhà cung cấp")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SupplierResponse>>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC)
                    Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.list(includeInactive, pageable)));
    }

    @Operation(summary = "Thêm nhà cung cấp (chỉ ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupplierResponse>> create(
            @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(supplierService.create(request), "Đã thêm nhà cung cấp"));
    }

    @Operation(summary = "Sửa nhà cung cấp (chỉ ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupplierResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(supplierService.update(id, request), "Đã cập nhật nhà cung cấp"));
    }

    @Operation(summary = "Ngừng dùng nhà cung cấp (chỉ ADMIN)")
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupplierResponse>> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(supplierService.setActive(id, false), "Đã ngừng dùng"));
    }

    @Operation(summary = "Dùng lại nhà cung cấp (chỉ ADMIN)")
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SupplierResponse>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.setActive(id, true), "Đã dùng lại"));
    }
}
