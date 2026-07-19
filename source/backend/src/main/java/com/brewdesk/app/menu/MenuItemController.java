package com.brewdesk.app.menu;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.menu.dto.MenuItemRequest;
import com.brewdesk.app.menu.dto.MenuItemResponse;
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

@Tag(name = "Món trên menu")
@RestController
@RequestMapping("/api/v1/menu-items")
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService menuItemService;

    @Operation(summary = "Danh sách món, lọc theo danh mục và từ khoá")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MenuItemResponse>>> list(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @PageableDefault(size = 20, sort = "displayOrder", direction = Sort.Direction.ASC)
                    Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        menuItemService.search(categoryId, keyword, includeInactive, pageable)));
    }

    @Operation(summary = "Chi tiết món")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuItemResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(menuItemService.get(id)));
    }

    @Operation(summary = "Tạo món (chỉ ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> create(
            @Valid @RequestBody MenuItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(menuItemService.create(request), "Đã tạo món"));
    }

    @Operation(summary = "Sửa món (chỉ ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody MenuItemRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(menuItemService.update(id, request), "Đã cập nhật món"));
    }

    @Operation(summary = "Ngừng bán món (chỉ ADMIN)")
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(menuItemService.deactivate(id), "Đã ngừng bán món"));
    }

    @Operation(summary = "Mở bán lại món (chỉ ADMIN)")
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MenuItemResponse>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(menuItemService.activate(id), "Đã mở bán lại món"));
    }
}
