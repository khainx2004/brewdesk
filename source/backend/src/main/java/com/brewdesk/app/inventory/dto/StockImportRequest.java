package com.brewdesk.app.inventory.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record StockImportRequest(
        @NotNull(message = "Chưa chọn nguyên liệu") UUID ingredientId,
        UUID supplierId,
        @NotNull(message = "Chưa chọn đơn vị nhập") UUID unitId,
        @Size(max = 50, message = "Mã lô tối đa 50 ký tự") String batchCode,
        @NotNull(message = "Chưa nhập số lượng")
                @Positive(message = "Số lượng nhập phải lớn hơn 0")
                @Digits(integer = 9, fraction = 3, message = "Số lượng tối đa 3 chữ số thập phân")
                BigDecimal quantity,
        @PositiveOrZero(message = "Đơn giá không được âm")
                @Digits(integer = 12, fraction = 0, message = "Đơn giá phải là số nguyên VNĐ")
                BigDecimal unitCost,
        LocalDate expiryDate,
        String note) {}
