package com.brewdesk.app.reconciliation;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftCashLineRepository extends JpaRepository<ShiftCashLine, UUID> {

    List<ShiftCashLine> findByReconciliationIdIn(Collection<UUID> reconciliationIds);
}
