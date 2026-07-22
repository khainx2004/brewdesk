package com.brewdesk.app.reconciliation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Số máy ghi nhận cho một ca, để màn bàn giao điền sẵn trước khi nhân viên đếm.
 *
 * <p>Có cả {@code openingAmount} vì người đếm cần biết két <b>đúng ra phải có
 * bao nhiêu</b> ngay lúc mở ca, chứ không phải đợi lưu phiếu xong mới thấy. Đó
 * mới là lúc phát hiện được "két thiếu tiền từ trước khi mình vào ca".
 */
public record CashSuggestionResponse(
        LocalDate date,
        UUID shiftTypeId,
        String shiftTypeName,
        /** Tiền mặt có sẵn trong két đầu ca, lấy từ số thực đếm của ca liền trước. */
        BigDecimal openingAmount,
        BigDecimal posAmount,
        BigDecimal posBankAmount,
        long orderCount,
        boolean alreadyReconciled) {}
