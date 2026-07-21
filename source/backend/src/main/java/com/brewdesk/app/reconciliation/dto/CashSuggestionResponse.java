package com.brewdesk.app.reconciliation.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Số máy ghi nhận cho một ca, để màn bàn giao điền sẵn dòng POS. */
public record CashSuggestionResponse(
        LocalDate date,
        UUID shiftTypeId,
        String shiftTypeName,
        BigDecimal posAmount,
        long orderCount,
        boolean alreadyReconciled) {}
