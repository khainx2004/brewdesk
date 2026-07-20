package com.brewdesk.app.inventory;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IngredientCategoryRepository extends JpaRepository<IngredientCategory, UUID> {

    List<IngredientCategory> findByActiveTrueOrderByDisplayOrderAsc();
}
