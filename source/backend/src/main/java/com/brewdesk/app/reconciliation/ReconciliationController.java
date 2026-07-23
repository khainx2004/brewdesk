package com.brewdesk.app.reconciliation;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.reconciliation.dto.CashSuggestionResponse;
import com.brewdesk.app.reconciliation.dto.ReconciliationRequest;
import com.brewdesk.app.reconciliation.dto.ReconciliationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Bàn giao ca")
@RestController
@RequestMapping("/api/v1/shift-reconciliations")
@RequiredArgsConstructor
public class ReconciliationController {

    private final ReconciliationService reconciliationService;

    @Operation(
            summary = "Số máy ghi nhận của một ca",
            description =
                    "Tổng tiền mặt hệ thống ghi nhận, để màn bàn giao điền sẵn dòng POS trước khi"
                        + " nhân viên đếm két.")
    @GetMapping("/suggest")
    public ResponseEntity<ApiResponse<CashSuggestionResponse>> suggest(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date,
            @RequestParam(required = false) UUID shiftTypeId) {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.suggest(date, shiftTypeId)));
    }

    @Operation(
            summary = "Lập phiếu bàn giao ca",
            description =
                    "Dòng POS do hệ thống tính từ đơn tiền mặt của ca, không nhận từ client. Chênh"
                        + " lệch = thực đếm − POS − đã chi.")
    @PostMapping
    public ResponseEntity<ApiResponse<ReconciliationResponse>> create(
            @Valid @RequestBody ReconciliationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        ApiResponse.ok(
                                reconciliationService.create(request), "Đã chốt ca"));
    }

    @Operation(summary = "Sửa phiếu (người lập hoặc ADMIN)")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReconciliationResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ReconciliationRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(reconciliationService.update(id, request), "Đã cập nhật"));
    }

    @Operation(summary = "Chi tiết phiếu bàn giao")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReconciliationResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.get(id)));
    }

    @Operation(summary = "Danh sách phiếu bàn giao")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReconciliationResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @PageableDefault(
                            size = 20,
                            sort = "reconciliationDate",
                            direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(reconciliationService.list(from, to, pageable)));
    }
}
