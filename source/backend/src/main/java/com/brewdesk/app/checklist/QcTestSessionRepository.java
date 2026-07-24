package com.brewdesk.app.checklist;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QcTestSessionRepository extends JpaRepository<QcTestSession, UUID> {

    /**
     * Không truyền null xuống query — dùng ngày canh biên và cờ {@code allShifts}
     * thay cho phép so với null (xem bài học Phase 3 / Phase 5).
     */
    @Query("""
            select s from QcTestSession s
            join fetch s.shiftType
            join fetch s.performedBy
            where s.sessionDate >= :from
              and s.sessionDate <= :to
              and (:allShifts = true or s.shiftType.id = :shiftTypeId)
            """)
    Page<QcTestSession> search(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("allShifts") boolean allShifts,
            @Param("shiftTypeId") UUID shiftTypeId,
            Pageable pageable);

    /** Ngày có phiên test gần nhất trước {@code today}; null nếu chưa từng test. */
    @Query("select max(s.sessionDate) from QcTestSession s where s.sessionDate < :today")
    LocalDate findMaxSessionDateBefore(@Param("today") LocalDate today);
}
