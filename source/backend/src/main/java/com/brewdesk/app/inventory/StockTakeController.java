package com.brewdesk.app.inventory;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.inventory.dto.StockTakeLineRequest;
import com.brewdesk.app.inventory.dto.StockTakeLineResponse;
import com.brewdesk.app.inventory.dto.StockTakeSessionRequest;
import com.brewdesk.app.inventory.dto.StockTakeSessionResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Kiểm kê kho")
@RestController
@RequestMapping("/api/v1/stock-takes")
@RequiredArgsConstructor
public class StockTakeController {

    private final StockTakeService stockTakeService;

    @Operation(summary = "Danh sách phiếu kiểm kê")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StockTakeSessionResponse>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(stockTakeService.list(pageable)));
    }

    @Operation(summary = "Chi tiết phiếu kiểm kê kèm các dòng đếm")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StockTakeSessionResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(stockTakeService.get(id)));
    }

    @Operation(summary = "Lập phiếu kiểm kê mới. Nhân viên đếm kho nên STAFF cũng lập được.")
    @PostMapping
    public ResponseEntity<ApiResponse<StockTakeSessionResponse>> create(
            @RequestBody StockTakeSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(stockTakeService.create(request), "Đã lập phiếu kiểm kê"));
    }

    @Operation(summary = "Thêm một dòng đếm vào phiếu")
    @PostMapping("/{id}/lines")
    public ResponseEntity<ApiResponse<StockTakeLineResponse>> addLine(
            @PathVariable UUID id, @Valid @RequestBody StockTakeLineRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(stockTakeService.addLine(id, request), "Đã thêm dòng"));
    }

    @Operation(summary = "Sửa một dòng đếm")
    @PutMapping("/{id}/lines/{lineId}")
    public ResponseEntity<ApiResponse<StockTakeLineResponse>> updateLine(
            @PathVariable UUID id,
            @PathVariable UUID lineId,
            @Valid @RequestBody StockTakeLineRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(stockTakeService.updateLine(id, lineId, request), "Đã cập nhật"));
    }

    @Operation(summary = "Xoá một dòng đếm khỏi phiếu chưa chốt")
    @DeleteMapping("/{id}/lines/{lineId}")
    public ResponseEntity<ApiResponse<Void>> deleteLine(
            @PathVariable UUID id, @PathVariable UUID lineId) {
        stockTakeService.deleteLine(id, lineId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã xoá dòng"));
    }

    @Operation(
            summary = "Chốt phiếu kiểm kê (chỉ ADMIN)",
            description =
                    "Ghi số thực đếm đè lên tồn hệ thống của từng nguyên liệu trong phiếu. Đây là"
                        + " sửa kho thủ công nên được ghi audit kèm chênh lệch. Chốt rồi thì phiếu"
                        + " khoá lại.")
    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StockTakeSessionResponse>> complete(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(stockTakeService.complete(id), "Đã chốt phiếu kiểm kê"));
    }
}
