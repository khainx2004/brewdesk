package com.brewdesk.app.reporting;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.reporting.dto.InventoryReportResponse;
import com.brewdesk.app.reporting.dto.QcSummaryResponse;
import com.brewdesk.app.reporting.dto.RevenueSummaryResponse;
import com.brewdesk.app.reporting.dto.StockVarianceResponse;
import com.brewdesk.app.reporting.dto.TopItemResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Báo cáo tài chính — CHỈ ADMIN. STAFF không được xem doanh thu / giá vốn
 * (CLAUDE.md mục 6). Không truyền ngày thì mặc định hôm nay.
 */
@Tag(name = "Báo cáo & Thống kê")
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "Doanh thu theo khoảng ngày (kèm theo ngày để vẽ biểu đồ)")
    @GetMapping("/revenue")
    public ResponseEntity<ApiResponse<RevenueSummaryResponse>> revenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.revenue(from, to)));
    }

    @Operation(summary = "Món bán chạy")
    @GetMapping("/top-items")
    public ResponseEntity<ApiResponse<List<TopItemResponse>>> topItems(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.topItems(from, to, limit)));
    }

    @Operation(summary = "Tồn kho hiện tại và giá trị tồn")
    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<InventoryReportResponse>> inventory() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.inventory()));
    }

    @Operation(summary = "Thống kê test cafe (tổng, tỷ lệ đạt, người test nhiều nhất)")
    @GetMapping("/qc-summary")
    public ResponseEntity<ApiResponse<QcSummaryResponse>> qcSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.qcSummary(from, to)));
    }

    @Operation(summary = "Hao hụt từ phiếu kiểm kê đã chốt")
    @GetMapping("/stock-variance")
    public ResponseEntity<ApiResponse<List<StockVarianceResponse>>> stockVariance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.stockVariance(from, to)));
    }
}
