package com.brewdesk.app.common.audit;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    /** Chỉ ghi khi method chạy xong không ném lỗi — thao tác thất bại thì không có gì để audit. */
    @Around("@annotation(auditable)")
    public Object around(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        Object result = joinPoint.proceed();
        auditService.record(auditable.action(), auditable.entityType(), extractId(result));
        return result;
    }

    private UUID extractId(Object result) {
        if (result instanceof UUID uuid) {
            return uuid;
        }
        if (result == null) {
            return null;
        }
        try {
            var method = result.getClass().getMethod("id");
            if (method.getReturnType() == UUID.class) {
                return (UUID) method.invoke(result);
            }
        } catch (ReflectiveOperationException ignored) {
            // DTO không có id() thì bỏ qua, audit vẫn ghi với entityId null.
        }
        return null;
    }
}
