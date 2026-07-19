package com.brewdesk.app.menu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Chưa nhập tên danh mục")
                @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
                String name,
        @PositiveOrZero(message = "Thứ tự hiển thị không được âm") int displayOrder) {}
