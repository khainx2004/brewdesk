package com.brewdesk.app.inventory;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IngredientRepository extends JpaRepository<Ingredient, UUID> {

    /**
     * Từ khoá nhận chuỗi rỗng nghĩa là không lọc. Truyền null vào đây thì
     * PostgreSQL không suy được kiểu tham số và báo lỗi lower(bytea).
     */
    @Query(
            """
            select i from Ingredient i
            join fetch i.category c
            join fetch i.unit u
            where (:categoryId is null or c.id = :categoryId)
              and (:includeInactive = true or i.active = true)
              and (:keyword = '' or lower(i.name) like lower(concat('%', :keyword, '%')))
              and (:lowStockOnly = false or i.stockQty <= i.lowStockThreshold)
            """)
    Page<Ingredient> search(
            @Param("categoryId") UUID categoryId,
            @Param("keyword") String keyword,
            @Param("includeInactive") boolean includeInactive,
            @Param("lowStockOnly") boolean lowStockOnly,
            Pageable pageable);

    @Query("""
        select count(i) from Ingredient i
        where i.active = true and i.stockQty <= i.lowStockThreshold
        """)
    long countLowStock();

    /**
     * Khoá dòng khi cập nhật tồn để hai lần nhập kho đồng thời không ghi đè nhau.
     * Phase 5 (trừ kho khi bán) cũng sẽ dùng đúng hàm này.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Ingredient i where i.id = :id")
    Optional<Ingredient> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Khoá nhiều nguyên liệu cùng lúc cho một đơn hàng — một query thay vì lặp
     * findByIdForUpdate từng cái.
     *
     * <p>{@code order by i.id} không phải để hiển thị mà để <b>tránh deadlock</b>:
     * hai đơn bán song song cùng đụng nguyên liệu A và B mà khoá theo thứ tự
     * ngược nhau thì chúng khoá chéo và cùng treo. Khoá theo cùng một thứ tự thì
     * đơn tới sau chỉ việc chờ.
     *
     * <p>Cố ý <b>không</b> join fetch unit và yieldUnit ở đây: PostgreSQL từ chối
     * FOR UPDATE khi câu lệnh có outer join ("cannot be applied to the nullable
     * side of an outer join"), mà yieldUnit thì nullable. Hai bảng đơn vị nhỏ và
     * đã seed cố định nên để lazy load là đủ.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Ingredient i where i.id in :ids order by i.id")
    List<Ingredient> findAllByIdInForUpdate(@Param("ids") Collection<UUID> ids);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsByCategoryIdAndActiveTrue(UUID categoryId);
}
