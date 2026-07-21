package com.brewdesk.app.reconciliation.dto;

import com.brewdesk.app.reconciliation.CashLineType;
import com.brewdesk.app.reconciliation.ShiftCashLine;
import com.brewdesk.app.reconciliation.ShiftCashReconciliation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

public record ReconciliationResponse(
        UUID id,
        LocalDate reconciliationDate,
        UUID shiftTypeId,
        String shiftTypeName,
        String handedOverByName,
        String receivedByName,
        String note,
        OffsetDateTime createdAt,
        BigDecimal posAmount,
        BigDecimal actualAmount,
        BigDecimal spentAmount,
        /** TT − POS − CHI. Âm là thiếu tiền, dương là thừa. */
        BigDecimal difference,
        /**
         * Số máy ghi nhận tính lại lúc xem, chỉ có ở màn chi tiết.
         *
         * <p>Khác {@code posAmount} nghĩa là sau khi chốt bàn giao còn có đơn bị
         * huỷ hoặc bán thêm trong ca đó. Hiện ra để thấy chứ không tự sửa phiếu —
         * phiếu là biên bản của lúc bàn giao.
         */
        BigDecimal posAmountNow,
        List<CashLineResponse> lines) {

    public static ReconciliationResponse from(
            ShiftCashReconciliation r, List<ShiftCashLine> lines, BigDecimal posAmountNow) {

        Map<CashLineType, ShiftCashLine> byType =
                lines.stream()
                        .collect(Collectors.toMap(ShiftCashLine::getLineType, Function.identity()));

        BigDecimal pos = amountOf(byType, CashLineType.POS);
        BigDecimal actual = amountOf(byType, CashLineType.TT);
        BigDecimal spent = amountOf(byType, CashLineType.CHI);

        return new ReconciliationResponse(
                r.getId(),
                r.getReconciliationDate(),
                r.getShiftType().getId(),
                r.getShiftType().getName(),
                r.getHandedOverBy().getFullName(),
                r.getReceivedBy() != null ? r.getReceivedBy().getFullName() : null,
                r.getNote(),
                r.getCreatedAt(),
                pos,
                actual,
                spent,
                actual.subtract(pos).subtract(spent),
                posAmountNow,
                lines.stream()
                        .sorted(Comparator.comparing(ShiftCashLine::getLineType))
                        .map(CashLineResponse::from)
                        .toList());
    }

    private static BigDecimal amountOf(Map<CashLineType, ShiftCashLine> byType, CashLineType type) {
        ShiftCashLine line = byType.get(type);
        return line != null ? line.getAmount() : BigDecimal.ZERO;
    }
}
