package com.brewdesk.app.inventory;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockTakeLineRepository extends JpaRepository<StockTakeLine, UUID> {

    List<StockTakeLine> findBySessionIdOrderByIngredientNameAsc(UUID sessionId);

    boolean existsBySessionIdAndIngredientId(UUID sessionId, UUID ingredientId);
}
