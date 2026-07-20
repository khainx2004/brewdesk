package com.brewdesk.app.inventory;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.inventory.dto.IngredientCategoryResponse;
import com.brewdesk.app.inventory.dto.UnitResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Danh mục tra cứu đã seed sẵn ở V2, chỉ đọc. */
@Tag(name = "Danh mục kho")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InventoryReferenceController {

    private final UnitRepository unitRepository;
    private final IngredientCategoryRepository categoryRepository;

    @Operation(summary = "Danh sách đơn vị tính")
    @GetMapping("/units")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<UnitResponse>>> units() {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        unitRepository.findByActiveTrueOrderByCodeAsc().stream()
                                .map(UnitResponse::from)
                                .toList()));
    }

    @Operation(summary = "Danh sách nhóm nguyên liệu")
    @GetMapping("/ingredient-categories")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<IngredientCategoryResponse>>> categories() {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        categoryRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                                .map(IngredientCategoryResponse::from)
                                .toList()));
    }
}
