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
