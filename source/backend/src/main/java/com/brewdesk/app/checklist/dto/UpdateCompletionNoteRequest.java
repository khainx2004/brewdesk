package com.brewdesk.app.checklist.dto;

/**
 * Sửa ghi chú của một lượt tick đã có.
 *
 * <p>Cần đến vì luồng UI đã chốt là "bấm tick trước, gõ ghi chú sau": ô ghi chú
 * chỉ hiện ra sau khi ô tròn đã sáng, lúc đó lượt tick đã tồn tại rồi nên
 * {@code POST complete} không dùng lại được.
 *
 * <p>Gửi null hoặc chuỗi rỗng để xoá ghi chú.
 */
public record UpdateCompletionNoteRequest(String note) {}
