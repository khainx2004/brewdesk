package com.brewdesk.app.reconciliation.dto;

import com.brewdesk.app.reconciliation.CashLineType;
import com.brewdesk.app.reconciliation.ShiftCashLine;
import java.math.BigDecimal;

public record CashLineResponse(
        CashLineType lineType, BigDecimal cashAmount, BigDecimal bankAmount, String note) {

    public static CashLineResponse from(ShiftCashLine line) {
        return new CashLineResponse(
                line.getLineType(), line.getCashAmount(), line.getBankAmount(), line.getNote());
    }
}
