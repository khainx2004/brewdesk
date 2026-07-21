package com.brewdesk.app.staff;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftTypeRepository extends JpaRepository<ShiftType, UUID> {

    List<ShiftType> findByActiveTrueOrderByDisplayOrderAsc();
}
