package com.brewdesk.app.menu;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.menu.dto.VariantResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Mức ngọt và mức đá")
@RestController
@RequestMapping("/api/v1/variants")
@RequiredArgsConstructor
public class VariantController {

    private final VariantService variantService;

    @Operation(summary = "Danh sách mức ngọt và mức đá")
    @GetMapping
    public ResponseEntity<ApiResponse<List<VariantResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(variantService.listAll()));
    }

    @Operation(summary = "Mức ngọt và mức đá, gom sẵn theo loại cho màn hình POS")
    @GetMapping("/grouped")
    public ResponseEntity<ApiResponse<Map<VariantType, List<VariantResponse>>>> grouped() {
        return ResponseEntity.ok(ApiResponse.ok(variantService.listGrouped()));
    }
}
