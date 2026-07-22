package com.brewdesk.app.reconciliation.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Phiếu bàn giao ca.
 *
 * <p>Cố ý <b>không</b> có trường cho dòng POS: đó là số máy ghi nhận, hệ thống tự
 * cộng từ các đơn tiền mặt của ca. Cho nhập tay thì việc đối chiếu mất hết ý
 * nghĩa — người đếm thiếu chỉ cần sửa dòng POS cho khớp là hết chênh lệch.
 *
 * <p>{@code openingAmount} thì <b>có</b> nhận, khác dòng POS. Để trống là hệ
 * thống lấy từ số thực đếm của ca liền trước; gửi lên là ghi đè. Cần đường sửa
 * vì chuỗi kế thừa có ba chỗ đứt thật: ca đầu tiên của quán chưa có gì để kế
 * thừa, bỏ sót một ca là lệch cả chuỗi, và tiền có thể bị lấy ra hay bỏ thêm
 * vào két ngoài giờ bàn giao.
 *
 * <p>Ai cũng ghi đè được, không riêng ADMIN — cùng cách quán xử giảm giá
 * (CLAUDE.md mục 6): chỗ dựa là dấu vết chứ không phải chặn trước. Mỗi lần số
 * gửi lên khác số hệ thống tính đều ghi audit {@code OVERRIDE_OPENING_AMOUNT}.
 *
 * <p>Không có trường cho phần chuyển khoản của dòng CHI: quán xác nhận khoản chi
 * luôn trả bằng tiền mặt. Cột {@code bank_amount} vẫn có ở DB nên nếu sau này
 * phát sinh thì mở thêm trường ở đây là đủ, không phải viết migration.
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
        /** Tiền chuyển khoản thực nhận trong ca, đối chiếu với app ngân hàng. */
        @PositiveOrZero(message = "Tiền chuyển khoản không được âm")
                @Digits(integer = 12, fraction = 0, message = "Số tiền phải là số nguyên")
                BigDecimal actualBankAmount,
        /**
         * Ghi đè tiền đầu ca. Null nghĩa là để hệ thống tự lấy từ ca liền trước.
         */
        @PositiveOrZero(message = "Tiền đầu ca không được âm")
                @Digits(integer = 12, fraction = 0, message = "Số tiền phải là số nguyên")
                BigDecimal openingAmount,
        /** Tiền mặt rút khỏi két trong ca. */
        @PositiveOrZero(message = "Số tiền rút không được âm")
                @Digits(integer = 12, fraction = 0, message = "Số tiền phải là số nguyên")
                BigDecimal withdrawnAmount,
        LocalTime startTime,
        LocalTime endTime,
        UUID receivedById,
        String note) {

    public BigDecimal spentOrZero() {
        return orZero(spentAmount);
    }

    public BigDecimal actualBankOrZero() {
        return orZero(actualBankAmount);
    }

    public BigDecimal withdrawnOrZero() {
        return orZero(withdrawnAmount);
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
