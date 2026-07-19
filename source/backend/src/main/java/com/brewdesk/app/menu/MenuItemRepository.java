package com.brewdesk.app.menu;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    /**
     * Lọc động theo danh mục, từ khoá và trạng thái. Gộp vào một query để tránh
     * bùng nổ số method khi thêm điều kiện.
     *
     * <p>Từ khoá nhận chuỗi rỗng thay vì null để nghĩa là "không lọc". Truyền null
     * vào đây thì PostgreSQL không suy được kiểu tham số, coi là bytea và báo lỗi
     * {@code function lower(bytea) does not exist}.
     */
    @Query(
            """
            select m from MenuItem m
            join fetch m.category c
            where (:categoryId is null or c.id = :categoryId)
              and (:includeInactive = true or m.active = true)
              and (:keyword = '' or lower(m.name) like lower(concat('%', :keyword, '%')))
            """)
    Page<MenuItem> search(
            @Param("categoryId") UUID categoryId,
            @Param("keyword") String keyword,
            @Param("includeInactive") boolean includeInactive,
            Pageable pageable);

    boolean existsByNameIgnoreCaseAndCategoryId(String name, UUID categoryId);

    boolean existsByNameIgnoreCaseAndCategoryIdAndIdNot(String name, UUID categoryId, UUID id);

    boolean existsByCategoryIdAndActiveTrue(UUID categoryId);
}
