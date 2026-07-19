package com.brewdesk.app.menu;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.menu.dto.CategoryRequest;
import com.brewdesk.app.menu.dto.CategoryResponse;
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

@Tag(name = "Danh mục món")
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Danh sách danh mục")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CategoryResponse>>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @PageableDefault(size = 20, sort = "displayOrder", direction = Sort.Direction.ASC)
                    Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.list(includeInactive, pageable)));
    }

    @Operation(summary = "Chi tiết danh mục")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.get(id)));
    }

    @Operation(summary = "Tạo danh mục (chỉ ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> create(
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(categoryService.create(request), "Đã tạo danh mục"));
    }

    @Operation(summary = "Sửa danh mục (chỉ ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(categoryService.update(id, request), "Đã cập nhật danh mục"));
    }

    @Operation(summary = "Ngừng hoạt động danh mục (chỉ ADMIN)")
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(categoryService.deactivate(id), "Đã ngừng hoạt động danh mục"));
    }

    @Operation(summary = "Mở lại danh mục (chỉ ADMIN)")
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryResponse>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(categoryService.activate(id), "Đã mở lại danh mục"));
    }
}
