package com.brewdesk.app.inventory;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.inventory.dto.StockImportRequest;
import com.brewdesk.app.inventory.dto.StockImportResponse;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Nhập kho")
@RestController
@RequestMapping("/api/v1/stock-imports")
@RequiredArgsConstructor
public class StockImportController {

    private final StockImportService stockImportService;

    @Operation(summary = "Lịch sử nhập kho")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StockImportResponse>>> list(
            @RequestParam(required = false) UUID ingredientId,
            @PageableDefault(size = 20, sort = "importedAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(stockImportService.list(ingredientId, pageable)));
    }

    @Operation(
            summary = "Nhập kho (chỉ ADMIN)",
            description =
                    "Ghi phiếu nhập và cộng tồn trong cùng một transaction. Số lượng nhập có thể"
                        + " dùng đơn vị khác đơn vị lưu kho, hệ thống tự quy đổi.")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StockImportResponse>> create(
            @Valid @RequestBody StockImportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(stockImportService.create(request), "Đã nhập kho"));
    }
}
