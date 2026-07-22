package com.brewdesk.app.reconciliation.dto;

import com.brewdesk.app.reconciliation.CashLineType;
import com.brewdesk.app.reconciliation.ShiftCashLine;
import com.brewdesk.app.reconciliation.ShiftCashReconciliation;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
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
        LocalTime startTime,
        LocalTime endTime,
        String note,
        OffsetDateTime createdAt,
        /** Tiền mặt có sẵn trong két đầu ca, lấy từ số thực đếm của ca liền trước. */
        BigDecimal openingAmount,
        BigDecimal posAmount,
        BigDecimal actualAmount,
        BigDecimal spentAmount,
        BigDecimal withdrawnAmount,
        /**
         * {@code (TT + CHI + Rút − Đầu ca) − POS}. Âm là thiếu tiền, dương là thừa.
         *
         * <p>CHI mang dấu <b>cộng</b>: tiền đã ra khỏi két nên phải bù lại mới ra
         * doanh thu thật. Bản chốt đầu tiên trừ nó thêm lần nữa, lệch đúng gấp đôi
         * số đã chi — xem CLAUDE.md mục 6, phần "Bàn giao ca".
         */
        BigDecimal difference,
        BigDecimal posBankAmount,
        BigDecimal actualBankAmount,
        /** {@code TT − POS} phần chuyển khoản. Tiền chuyển khoản không đi qua két. */
        BigDecimal bankDifference,
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

        BigDecimal pos = cashOf(byType, CashLineType.POS);
        BigDecimal actual = cashOf(byType, CashLineType.TT);
        BigDecimal spent = cashOf(byType, CashLineType.CHI);
        BigDecimal opening = r.getOpeningAmount();
        BigDecimal withdrawn = r.getWithdrawnAmount();

        BigDecimal posBank = bankOf(byType, CashLineType.POS);
        BigDecimal actualBank = bankOf(byType, CashLineType.TT);
        BigDecimal spentBank = bankOf(byType, CashLineType.CHI);

        return new ReconciliationResponse(
                r.getId(),
                r.getReconciliationDate(),
                r.getShiftType().getId(),
                r.getShiftType().getName(),
                r.getHandedOverBy().getFullName(),
                r.getReceivedBy() != null ? r.getReceivedBy().getFullName() : null,
                r.getStartTime(),
                r.getEndTime(),
                r.getNote(),
                r.getCreatedAt(),
                opening,
                pos,
                actual,
                spent,
                withdrawn,
                // (TT + CHI + Rút − Đầu ca) − POS
                actual.add(spent).add(withdrawn).subtract(opening).subtract(pos),
                posBank,
                actualBank,
                actualBank.add(spentBank).subtract(posBank),
                posAmountNow,
                lines.stream()
                        .sorted(Comparator.comparing(ShiftCashLine::getLineType))
                        .map(CashLineResponse::from)
                        .toList());
    }

    private static BigDecimal cashOf(Map<CashLineType, ShiftCashLine> byType, CashLineType type) {
        ShiftCashLine line = byType.get(type);
        return line != null ? line.getCashAmount() : BigDecimal.ZERO;
    }

    private static BigDecimal bankOf(Map<CashLineType, ShiftCashLine> byType, CashLineType type) {
        ShiftCashLine line = byType.get(type);
        return line != null ? line.getBankAmount() : BigDecimal.ZERO;
    }
}
