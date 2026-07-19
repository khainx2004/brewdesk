package com.brewdesk.app.menu;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VariantRepository extends JpaRepository<Variant, UUID> {

    List<Variant> findByActiveTrueOrderByVariantTypeAscDisplayOrderAsc();
}
