package com.brewdesk.app.inventory;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTakeSessionRepository extends JpaRepository<StockTakeSession, UUID> {

    Page<StockTakeSession> findAllByOrderBySessionDateDescCreatedAtDesc(Pageable pageable);
}
