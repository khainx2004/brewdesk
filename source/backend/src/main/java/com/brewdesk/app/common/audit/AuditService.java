package com.brewdesk.app.common.audit;

import com.brewdesk.app.common.security.CurrentUser;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Ghi audit trong transaction riêng: nghiệp vụ chính lỗi và rollback thì vẫn
     * còn dấu vết, và ngược lại audit lỗi cũng không kéo đổ nghiệp vụ chính.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(String action, String entityType, UUID entityId, String detail) {
        try {
            AuditLog entry =
                    AuditLog.builder()
                            .userId(CurrentUser.findId().orElse(null))
                            .action(action)
                            .entityType(entityType)
                            .entityId(entityId)
                            .detail(detail)
                            .ipAddress(clientIp())
                            .build();
            auditLogRepository.save(entry);
        } catch (RuntimeException ex) {
            // Không để việc ghi nhật ký làm hỏng thao tác nghiệp vụ.
            log.error("Ghi audit thất bại: action={} entityType={}", action, entityType, ex);
        }
    }

    public void record(String action, String entityType, UUID entityId) {
        record(action, entityType, entityId, null);
    }

    private String clientIp() {
        if (!(RequestContextHolder.getRequestAttributes()
                instanceof ServletRequestAttributes attributes)) {
            return null;
        }
        var request = attributes.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Nginx nối nhiều IP bằng dấu phẩy, IP client là phần tử đầu.
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
