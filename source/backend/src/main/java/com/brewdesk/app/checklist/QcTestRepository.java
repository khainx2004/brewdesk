package com.brewdesk.app.checklist;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QcTestRepository extends JpaRepository<QcTest, UUID> {

    @Query("""
            select t from QcTest t
            left join fetch t.stockImport si
            left join fetch si.ingredient
            where t.session.id in :sessionIds
            order by t.createdAt asc
            """)
    List<QcTest> findBySessionIds(@Param("sessionIds") Collection<UUID> sessionIds);
}
