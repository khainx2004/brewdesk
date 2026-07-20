package com.brewdesk.app.inventory;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StockImportRepository extends JpaRepository<StockImport, UUID> {

    @Query("""
        select s from StockImport s
        join fetch s.ingredient i
        join fetch s.unit u
        left join fetch s.supplier sup
        where (:ingredientId is null or i.id = :ingredientId)
        """)
    Page<StockImport> search(@Param("ingredientId") UUID ingredientId, Pageable pageable);
}
