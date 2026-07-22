package com.brewdesk.app.reconciliation;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShiftCashReconciliationRepository
        extends JpaRepository<ShiftCashReconciliation, UUID> {

    boolean existsByReconciliationDateAndShiftTypeId(LocalDate date, UUID shiftTypeId);

    @Query("""
            select r from ShiftCashReconciliation r
            join fetch r.shiftType
            join fetch r.handedOverBy
            left join fetch r.receivedBy
            where r.id = :id
            """)
    Optional<ShiftCashReconciliation> findDetailById(@Param("id") UUID id);

    /**
     * Phiếu của ca liền trước, để lấy tiền đầu ca.
     *
     * <p>"Liền trước" xếp theo ngày rồi tới giờ bắt đầu ca, chứ không theo
     * {@code created_at}: phiếu lập bù muộn vẫn phải nằm đúng vị trí của ca nó
     * thuộc về. Trả về một trang để lấy đúng bản ghi đầu tiên.
     */
    @Query("""
            select r from ShiftCashReconciliation r
            join fetch r.shiftType s
            where r.reconciliationDate < :day
               or (r.reconciliationDate = :day and s.startTime < :startTime)
            order by r.reconciliationDate desc, s.startTime desc
            """)
    java.util.List<ShiftCashReconciliation> findPrevious(
            @Param("day") LocalDate day,
            @Param("startTime") java.time.LocalTime startTime,
            Pageable pageable);

    /** Ngày canh biên thay cho null — xem bài học ở Phase 3 / Phase 5. */
    @Query("""
            select r from ShiftCashReconciliation r
            join fetch r.shiftType
            join fetch r.handedOverBy
            left join fetch r.receivedBy
            where r.reconciliationDate >= :from
              and r.reconciliationDate <= :to
            """)
    Page<ShiftCashReconciliation> search(
            @Param("from") LocalDate from, @Param("to") LocalDate to, Pageable pageable);
}
