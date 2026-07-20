package com.brewdesk.app.inventory.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record IngredientRequest(
        @NotNull(message = "Chưa chọn nhóm nguyên liệu") UUID categoryId,
        @NotNull(message = "Chưa chọn đơn vị tính") UUID unitId,
        @NotBlank(message = "Chưa nhập tên nguyên liệu")
                @Size(max = 150, message = "Tên nguyên liệu tối đa 150 ký tự")
                String name,
        @NotNull(message = "Chưa nhập ngưỡng cảnh báo sắp hết")
                @PositiveOrZero(message = "Ngưỡng cảnh báo không được âm")
                @Digits(integer = 9, fraction = 3, message = "Ngưỡng tối đa 3 chữ số thập phân")
                BigDecimal lowStockThreshold,
        /** Chỉ ADMIN gửi được. Service bỏ qua trường này nếu người gọi là STAFF. */
        @PositiveOrZero(message = "Giá vốn không được âm")
                @Digits(
                        integer = 12,
                        fraction = 0,
                        message = "Giá vốn phải là số nguyên VNĐ, không có phần thập phân")
                BigDecimal costPrice,
        /**
         * Bán thành phẩm: đơn vị thành phẩm sau sơ chế. Để trống với nguyên liệu
         * dùng trực tiếp. Ví dụ trà lưu kho bằng kg lá khô thì yieldUnit là l.
         */
        UUID yieldUnitId,
        /** Số đơn vị thành phẩm thu được từ 1 đơn vị lưu kho, ví dụ 1 kg lá ra 50 l. */
        @Positive(message = "Tỉ lệ ủ phải lớn hơn 0")
                @Digits(integer = 9, fraction = 3, message = "Tỉ lệ ủ tối đa 3 chữ số thập phân")
                BigDecimal yieldQuantity) {}
