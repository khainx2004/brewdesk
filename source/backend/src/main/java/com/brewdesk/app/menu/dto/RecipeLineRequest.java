package com.brewdesk.app.menu.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record RecipeLineRequest(
        @NotNull(message = "Chưa chọn nguyên liệu") UUID ingredientId,
        @NotNull(message = "Chưa nhập định lượng")
                @Positive(message = "Định lượng phải lớn hơn 0")
                @Digits(integer = 9, fraction = 3, message = "Định lượng tối đa 3 chữ số thập phân")
                BigDecimal quantity,
        @NotNull(message = "Chưa chọn đơn vị") UUID unitId) {}
