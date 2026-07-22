package com.brewdesk.app.checklist;

import com.brewdesk.app.checklist.dto.ChecklistBoardResponse;
import com.brewdesk.app.checklist.dto.ChecklistCompletionResponse;
import com.brewdesk.app.checklist.dto.ChecklistWeekResponse;
import com.brewdesk.app.checklist.dto.CompleteChecklistRequest;
import com.brewdesk.app.checklist.dto.UpdateCompletionNoteRequest;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Checklist — thực hiện")
@RestController
@RequestMapping("/api/v1/checklists")
@RequiredArgsConstructor
public class ChecklistController {

    private final ChecklistService checklistService;

    @Operation(
            summary = "Checklist của một ngày và một ca",
            description =
                    "Không truyền gì thì lấy hôm nay và ca hiện tại theo giờ server. Việc hàng"
                        + " tuần / hàng tháng hiện là đã xong nếu đã tick ở bất kỳ ngày nào trong"
                        + " tuần / tháng đó.")
    @GetMapping
    public ResponseEntity<ApiResponse<ChecklistBoardResponse>> board(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date,
            @RequestParam(required = false) UUID shiftTypeId) {
        return ResponseEntity.ok(ApiResponse.ok(checklistService.board(date, shiftTypeId)));
    }

    @Operation(
            summary = "Lưới việc hàng tuần — mỗi việc 7 ô ngày",
            description =
                    "Không lọc theo ca, vì việc của thứ 5 vẫn phải thấy được khi đang mở ca sáng."
                        + " Mỗi ô ngày kèm sẵn cờ scheduled / done / overdue / extra / future để"
                        + " frontend không phải tự tính 'hôm nay' theo giờ máy.")
    @GetMapping("/week")
    public ResponseEntity<ApiResponse<ChecklistWeekResponse>> week(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date) {
        return ResponseEntity.ok(ApiResponse.ok(checklistService.week(date)));
    }

    @Operation(summary = "Tick một đầu việc đã làm xong")
    @PostMapping("/{templateId}/complete")
    public ResponseEntity<ApiResponse<ChecklistCompletionResponse>> complete(
            @PathVariable UUID templateId, @Valid @RequestBody CompleteChecklistRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        ApiResponse.ok(
                                checklistService.complete(templateId, request), "Đã tick"));
    }

    /**
     * Bỏ tick khi lỡ tay. Ai đang trong ca cũng bỏ được, không riêng người đã
     * tick — nhân viên làm chung một quầy, bắt đi tìm đúng người chỉ gây tắc.
     * Mọi lần bỏ tick đều có audit.
     */
    @Operation(summary = "Bỏ tick")
    @DeleteMapping("/completions/{completionId}")
    public ResponseEntity<ApiResponse<Void>> uncomplete(@PathVariable UUID completionId) {
        checklistService.uncomplete(completionId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Đã bỏ tick"));
    }

    /**
     * Cần vì luồng UI đã chốt là "bấm tick trước, gõ ghi chú sau" — lúc gõ thì
     * lượt tick đã tồn tại nên POST complete không dùng lại được.
     */
    @Operation(summary = "Sửa ghi chú của một lượt tick")
    @PatchMapping("/completions/{completionId}")
    public ResponseEntity<ApiResponse<ChecklistCompletionResponse>> updateNote(
            @PathVariable UUID completionId,
            @Valid @RequestBody UpdateCompletionNoteRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        checklistService.updateNote(completionId, request), "Đã lưu ghi chú"));
    }

    @Operation(summary = "Lịch sử tick")
    @GetMapping("/completions")
    public ResponseEntity<ApiResponse<PageResponse<ChecklistCompletionResponse>>> history(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to,
            @RequestParam(required = false) UUID templateId,
            @PageableDefault(size = 20, sort = "completionDate", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(checklistService.history(from, to, templateId, pageable)));
    }
}
