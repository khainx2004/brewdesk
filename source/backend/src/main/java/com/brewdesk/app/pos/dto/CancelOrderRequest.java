package com.brewdesk.app.pos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Bắt buộc có lý do: huỷ đơn là thao tác vừa mất doanh thu vừa hoàn kho, không
 * ghi lý do thì đối soát cuối ca không biết vì sao lệch.
 */
public record CancelOrderRequest(
        @NotBlank(message = "Cần nhập lý do huỷ đơn")
                @Size(max = 500, message = "Lý do huỷ tối đa 500 ký tự")
                String reason) {}
