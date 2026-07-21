package com.brewdesk.app.reconciliation.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Phiếu bàn giao ca.
 *
 * <p>Cố ý <b>không</b> có trường cho dòng POS: đó là số máy ghi nhận, hệ thống tự
 * cộng từ các đơn tiền mặt của ca. Cho nhập tay thì việc đối chiếu mất hết ý
 * nghĩa — người đếm thiếu chỉ cần sửa dòng POS cho khớp là hết chênh lệch.
 *
 * <p>{@code date} và {@code shiftTypeId} chỉ dùng lúc tạo, sửa thì bỏ qua: đổi
 * ngày hoặc ca của một phiếu đã lập là tạo phiếu mới chứ không phải sửa.
 */
public record ReconciliationRequest(
        LocalDate date,
        UUID shiftTypeId,
        @NotNull(message = "Chưa nhập số tiền thực đếm")
                @PositiveOrZero(message = "Số tiền thực đếm không được âm")
                @Digits(integer = 12, fraction = 0, message = "Số tiền phải là số nguyên")
                BigDecimal actualAmount,
        @PositiveOrZero(message = "Khoản đã chi không được âm")
                @Digits(integer = 12, fraction = 0, message = "Số tiền phải là số nguyên")
                BigDecimal spentAmount,
        String spentNote,
        UUID receivedById,
        String note) {

    public BigDecimal spentOrZero() {
        return spentAmount != null ? spentAmount : BigDecimal.ZERO;
    }
}
