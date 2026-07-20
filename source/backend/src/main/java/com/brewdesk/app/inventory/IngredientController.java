package com.brewdesk.app.inventory;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.inventory.dto.IngredientRequest;
import com.brewdesk.app.inventory.dto.IngredientResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
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

@Tag(name = "Nguyên liệu")
@RestController
@RequestMapping("/api/v1/ingredients")
@RequiredArgsConstructor
public class IngredientController {

    private final IngredientService ingredientService;

    @Operation(summary = "Danh sách nguyên liệu. Giá vốn chỉ trả về cho ADMIN.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<IngredientResponse>>> list(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "false") boolean lowStockOnly,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC)
                    Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        ingredientService.search(
                                categoryId, keyword, includeInactive, lowStockOnly, pageable)));
    }

    @Operation(summary = "Số nguyên liệu đang dưới ngưỡng cảnh báo")
    @GetMapping("/low-stock-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> lowStockCount() {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", ingredientService.countLowStock())));
    }

    @Operation(summary = "Chi tiết nguyên liệu")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IngredientResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(ingredientService.get(id)));
    }

    @Operation(summary = "Thêm nguyên liệu (chỉ ADMIN). Tồn luôn bắt đầu từ 0, phải nhập kho.")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IngredientResponse>> create(
            @Valid @RequestBody IngredientRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(ingredientService.create(request), "Đã thêm nguyên liệu"));
    }

    @Operation(summary = "Sửa nguyên liệu (chỉ ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IngredientResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody IngredientRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(ingredientService.update(id, request), "Đã cập nhật nguyên liệu"));
    }

    @Operation(summary = "Ngừng dùng nguyên liệu (chỉ ADMIN)")
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IngredientResponse>> deactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(ingredientService.setActive(id, false), "Đã ngừng dùng nguyên liệu"));
    }

    @Operation(summary = "Dùng lại nguyên liệu (chỉ ADMIN)")
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IngredientResponse>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(ingredientService.setActive(id, true), "Đã dùng lại nguyên liệu"));
    }
}
