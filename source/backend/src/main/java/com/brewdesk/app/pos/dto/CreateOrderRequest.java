package com.brewdesk.app.pos.dto;

import com.brewdesk.app.pos.DiscountType;
import com.brewdesk.app.pos.PaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.List;

/**
 * Ca làm việc không nằm trong request: server tự xác định theo giờ của mình,
 * xem {@code ShiftService}.
 */
public record CreateOrderRequest(
        @NotEmpty(message = "Đơn hàng chưa có món nào") @Valid List<OrderLineRequest> lines,
        @NotNull(message = "Thiếu hình thức thanh toán") PaymentMethod paymentMethod,
        /** Null nghĩa là không giảm giá. */
        DiscountType discountType,
        @PositiveOrZero(message = "Giảm giá không được âm")
                @Digits(integer = 12, fraction = 0, message = "Giảm giá phải là số nguyên")
                BigDecimal discountValue,
        String note) {}
