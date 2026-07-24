package com.brewdesk.app.checklist;

import com.brewdesk.app.checklist.dto.QcProfileCellResponse;
import com.brewdesk.app.checklist.dto.QcSessionRequest;
import com.brewdesk.app.checklist.dto.QcSessionResponse;
import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Test cafe (QC)")
@RestController
@RequestMapping("/api/v1/qc-tests")
@RequiredArgsConstructor
public class QcController {

    private final QcService qcService;

    @Operation(
            summary = "Ghi một phiên test cafe",
            description =
                    "Gửi cả phiên kèm các lần chiết trong một request. Ca lấy theo giờ server nếu"
                        + " không chỉ định.")
    @PostMapping
    public ResponseEntity<ApiResponse<QcSessionResponse>> create(
            @Valid @RequestBody QcSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(qcService.create(request), "Đã lưu phiên test"));
    }

    @Operation(
            summary = "Profile pha hôm nay",
            description =
                    "Thông số lần test đã đạt gần nhất cho mỗi ô ca × loại hạt × liều. Suy từ"
                        + " chính các lần test đạt, loại hạt lấy từ lô cà phê.")
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<java.util.List<QcProfileCellResponse>>> profile() {
        return ResponseEntity.ok(ApiResponse.ok(qcService.profile()));
    }

    @Operation(
            summary = "Lịch sử — phiên test của ngày gần nhất trước hôm nay",
            description =
                    "Màn Test cafe tách test hôm nay (Profile hôm nay + phiên đang ghi) khỏi lịch"
                        + " sử; lịch sử chỉ soi lại ngày liền trước có test.")
    @GetMapping("/previous-day")
    public ResponseEntity<ApiResponse<java.util.List<QcSessionResponse>>> previousDay() {
        return ResponseEntity.ok(ApiResponse.ok(qcService.previousDay()));
    }

    @Operation(summary = "Chi tiết một phiên test")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<QcSessionResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(qcService.get(id)));
    }

    @Operation(summary = "Danh sách phiên test")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<QcSessionResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(required = false) UUID shiftTypeId,
            @PageableDefault(size = 20, sort = "sessionDate", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(qcService.list(from, to, shiftTypeId, pageable)));
    }
}
