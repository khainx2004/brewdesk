package com.brewdesk.app.inventory.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.UUID;

public record StockTakeLineRequest(
        @NotNull(message = "Chưa chọn nguyên liệu") UUID ingredientId,
        @NotNull(message = "Chưa nhập số lượng thực đếm")
                @PositiveOrZero(message = "Số lượng thực đếm không được âm")
                @Digits(integer = 9, fraction = 3, message = "Tối đa 3 chữ số thập phân")
                BigDecimal actualQty,
        String note) {}
