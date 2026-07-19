package com.brewdesk.app.menu.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record MenuItemRequest(
        @NotNull(message = "Chưa chọn danh mục") UUID categoryId,
        @NotBlank(message = "Chưa nhập tên món")
                @Size(max = 150, message = "Tên món tối đa 150 ký tự")
                String name,
        String description,
        @NotNull(message = "Chưa nhập giá")
                @PositiveOrZero(message = "Giá không được âm")
                @Digits(
                        integer = 12,
                        fraction = 0,
                        message = "Giá phải là số nguyên VNĐ, không có phần thập phân")
                BigDecimal price,
        @PositiveOrZero(message = "Thứ tự hiển thị không được âm") int displayOrder) {}
