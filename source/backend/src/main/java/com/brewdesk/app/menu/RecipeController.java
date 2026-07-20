package com.brewdesk.app.menu;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.menu.dto.RecipeLineRequest;
import com.brewdesk.app.menu.dto.RecipeLineResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Công thức món")
@RestController
@RequestMapping("/api/v1/menu-items/{menuItemId}/recipes")
@RequiredArgsConstructor
public class RecipeController {

    private final RecipeService recipeService;

    @Operation(summary = "Công thức nguyên liệu của món")
    @GetMapping
    public ResponseEntity<ApiResponse<List<RecipeLineResponse>>> get(
            @PathVariable UUID menuItemId) {
        return ResponseEntity.ok(ApiResponse.ok(recipeService.get(menuItemId)));
    }

    @Operation(
            summary = "Thay toàn bộ công thức của món (chỉ ADMIN)",
            description =
                    "Gửi danh sách đầy đủ; công thức cũ bị thay hết. Gửi mảng rỗng để xoá công"
                        + " thức. Đơn vị từng dòng phải quy đổi được sang đơn vị lưu kho của"
                        + " nguyên liệu.")
    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<RecipeLineResponse>>> replace(
            @PathVariable UUID menuItemId,
            @RequestBody List<@Valid RecipeLineRequest> lines) {
        return ResponseEntity.ok(
                ApiResponse.ok(recipeService.replace(menuItemId, lines), "Đã lưu công thức"));
    }
}
