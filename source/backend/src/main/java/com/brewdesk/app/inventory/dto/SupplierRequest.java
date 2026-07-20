package com.brewdesk.app.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplierRequest(
        @NotBlank(message = "Chưa nhập tên nhà cung cấp")
                @Size(max = 150, message = "Tên nhà cung cấp tối đa 150 ký tự")
                String name,
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự") String phone,
        String address,
        String note) {}
