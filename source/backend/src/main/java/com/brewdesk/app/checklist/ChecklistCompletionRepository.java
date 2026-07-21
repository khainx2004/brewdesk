package com.brewdesk.app.checklist;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChecklistCompletionRepository
        extends JpaRepository<ChecklistCompletion, UUID> {

    /**
     * Các lượt tick của một nhóm đầu việc trong một khoảng ngày, kèm sẵn người
     * làm — màn hình checklist cần hiện tên nên fetch luôn, tránh N+1.
     */
    @Query("""
            select distinct c from ChecklistCompletion c
            join fetch c.template
            left join fetch c.shiftType
            left join fetch c.staff
            where c.template.id in :templateIds
              and c.completionDate between :from and :to
            """)
    List<ChecklistCompletion> findForTemplatesInRange(
            @Param("templateIds") Collection<UUID> templateIds,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /**
     * Lịch sử tick, có phân trang.
     *
     * <p>Cố ý <b>không</b> fetch {@code staff} ở đây: fetch join một collection
     * cùng lúc với phân trang buộc Hibernate kéo hết bản ghi về rồi mới cắt trang
     * trong bộ nhớ. Tên người làm lấy bằng {@link #findWithStaffByIds} sau khi đã
     * biết trang chứa những dòng nào.
     */
    @Query("""
            select c from ChecklistCompletion c
            join fetch c.template
            left join fetch c.shiftType
            where c.completionDate >= :from
              and c.completionDate <= :to
              and (:allTemplates = true or c.template.id = :templateId)
            """)
    Page<ChecklistCompletion> search(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allTemplates") boolean allTemplates,
            @Param("templateId") UUID templateId,
            Pageable pageable);

    @Query("""
            select distinct c from ChecklistCompletion c
            left join fetch c.staff
            where c.id in :ids
            """)
    List<ChecklistCompletion> findWithStaffByIds(@Param("ids") Collection<UUID> ids);

    boolean existsByTemplateIdAndCompletionDate(UUID templateId, LocalDate completionDate);

    long countByTemplateId(UUID templateId);
}
