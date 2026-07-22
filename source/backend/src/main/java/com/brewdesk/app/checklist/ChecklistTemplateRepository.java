package com.brewdesk.app.checklist;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChecklistTemplateRepository extends JpaRepository<ChecklistTemplate, UUID> {

    /**
     * Trùng tên được phép nếu khác ca — cùng một việc làm hai lần trong ngày ở
     * hai ca là chuyện thật của quán. Trả về danh sách để service lọc tiếp theo
     * ca, cùng cách Phase 3 xử món trùng tên khác danh mục.
     */
    List<ChecklistTemplate> findAllByTitleIgnoreCase(String title);

    /**
     * Đầu việc phải làm trong một ca: việc gắn đúng ca đó, cộng việc không gắn ca
     * nào (ca nào cũng làm).
     *
     * <p>Không truyền null xuống query — xem bài học ở Phase 3 và Phase 5:
     * PostgreSQL không suy được kiểu của tham số chỉ xuất hiện trong phép so với
     * null. Ở đây dùng cờ {@code allShifts} để {@code shiftTypeId} luôn có giá
     * trị thật.
     */
    @Query("""
            select t from ChecklistTemplate t
            left join fetch t.shiftType
            where t.active = true
              and (:allShifts = true or t.shiftType is null or t.shiftType.id = :shiftTypeId)
            order by t.displayOrder asc, t.title asc
            """)
    List<ChecklistTemplate> findActiveForShift(
            @Param("allShifts") boolean allShifts, @Param("shiftTypeId") UUID shiftTypeId);

    @Query("""
            select t from ChecklistTemplate t
            left join fetch t.shiftType
            where (:includeInactive = true or t.active = true)
            order by t.displayOrder asc, t.title asc
            """)
    List<ChecklistTemplate> findAllOrdered(@Param("includeInactive") boolean includeInactive);
}
