package com.brewdesk.app.common.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Đánh dấu thao tác nhạy cảm cần ghi audit: hủy đơn, giảm giá, sửa kho thủ công,
 * tạo/khoá tài khoản.
 *
 * <p>Aspect cố ý KHÔNG ghi tham số của method vào audit, vì có method nhận mật
 * khẩu thô. Cần ghi chi tiết thì gọi thẳng {@link AuditService#record}.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {

    String action();

    String entityType();
}
