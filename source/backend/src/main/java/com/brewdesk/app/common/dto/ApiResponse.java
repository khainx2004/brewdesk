package com.brewdesk.app.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Vỏ bọc chung cho mọi response, theo CLAUDE.md mục 4.
 *
 * <p>Ép ALWAYS để các khoá null vẫn xuất hiện trong JSON — client dựa vào sự có
 * mặt của khoá chứ không phải đoán, dù cấu hình Jackson toàn cục là non_null.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(boolean success, T data, String message, String errorCode) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, data, message, null);
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return new ApiResponse<>(false, null, message, errorCode);
    }
}
