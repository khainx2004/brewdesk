package com.brewdesk.app.pos;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.pos.dto.CancelOrderRequest;
import com.brewdesk.app.pos.dto.CreateOrderRequest;
import com.brewdesk.app.pos.dto.OrderResponse;
import com.brewdesk.app.pos.dto.OrderSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Bán hàng (POS)")
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Operation(
            summary = "Tạo đơn hàng",
            description =
                    "Ghi đơn và trừ kho theo công thức trong cùng một transaction. Ca làm việc do"
                        + " server tự xác định theo giờ của mình, không nhận từ client.")
    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> create(
            @Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(orderService.create(request), "Đã tạo đơn hàng"));
    }

    /**
     * Dùng PATCH chứ không phải DELETE: đơn bị huỷ vẫn nằm nguyên trong sổ, chỉ
     * đổi trạng thái. Xem CLAUDE.md mục 4.
     *
     * <p>STAFF cũng được huỷ, không chỉ ADMIN — quy trình sửa đơn của quán là huỷ
     * đơn cũ rồi tạo đơn mới, chặn STAFF thì mỗi lần gõ nhầm lại phải đi tìm chủ.
     * Bù lại mọi lần huỷ đều bắt buộc ghi lý do và có audit.
     */
    @Operation(
            summary = "Huỷ đơn hàng",
            description = "Xoá mềm, hoàn kho tự động trong cùng transaction, có ghi audit.")
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancel(
            @PathVariable UUID id, @Valid @RequestBody CancelOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.cancel(id, request), "Đã huỷ đơn"));
    }

    @Operation(summary = "Chi tiết đơn hàng")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.get(id)));
    }

    @Operation(
            summary = "Danh sách đơn hàng",
            description = "Mặc định ẩn đơn đã huỷ. Khoảng thời gian theo ISO-8601, ví dụ"
                    + " 2026-07-21T00:00:00+07:00.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderSummaryResponse>>> list(
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    OffsetDateTime from,
            @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    OffsetDateTime to,
            @RequestParam(required = false) UUID shiftTypeId,
            @RequestParam(defaultValue = "false") boolean includeCancelled,
            @RequestParam(required = false) String code,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        orderService.list(
                                from, to, shiftTypeId, includeCancelled, code, pageable)));
    }
}
