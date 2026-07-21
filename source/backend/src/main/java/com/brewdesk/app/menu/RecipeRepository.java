package com.brewdesk.app.menu;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RecipeRepository extends JpaRepository<Recipe, UUID> {

    @Query("""
        select r from Recipe r
        join fetch r.ingredient i
        join fetch i.unit
        join fetch r.unit
        where r.menuItem.id = :menuItemId
        order by i.name asc
        """)
    List<Recipe> findByMenuItemId(@Param("menuItemId") UUID menuItemId);

    /**
     * @Modifying bắt buộc ở đây: derived delete method mặc định chỉ đánh dấu xoá
     * trong persistence context chứ không gửi SQL ngay. Hibernate flush INSERT
     * trước DELETE trong cùng một lượt flush, nên nếu RecipeService.replace()
     * xoá xong rồi insert dòng mới cùng (menuItem, ingredient) mà không có
     * @Modifying, INSERT sẽ chạy trước DELETE và đụng unique constraint
     * uq_recipes. @Modifying khiến DELETE thực thi ngay khi gọi, không đợi flush.
     */
    @Modifying
    @Query("delete from Recipe r where r.menuItem.id = :menuItemId")
    void deleteByMenuItemId(@Param("menuItemId") UUID menuItemId);

    /**
     * Công thức của nhiều món cùng lúc, cho luồng bán hàng. Chỉ fetch đơn vị của
     * dòng công thức — nguyên liệu cố ý để nguyên proxy, xem
     * {@code findIngredientIdsByMenuItemIds}.
     */
    @Query("""
        select r from Recipe r
        join fetch r.unit
        where r.menuItem.id in :menuItemIds
        """)
    List<Recipe> findByMenuItemIdIn(@Param("menuItemIds") Collection<UUID> menuItemIds);

    /**
     * Chỉ lấy id nguyên liệu, không nạp entity.
     *
     * <p>Thứ tự bắt buộc khi bán là: biết cần khoá những nguyên liệu nào → khoá
     * chúng → mới đọc tồn. Nếu nạp entity Ingredient trước khi khoá thì bản đã
     * nạp nằm sẵn trong persistence context, và câu lệnh khoá sau đó
     * <b>không</b> ghi đè state cũ (repeatable read trong phạm vi session) — tức
     * là trừ kho dựa trên tồn cũ. Query scalar này tránh hẳn cái bẫy đó.
     */
    @Query("""
        select distinct r.ingredient.id from Recipe r
        where r.menuItem.id in :menuItemIds
        """)
    List<UUID> findIngredientIdsByMenuItemIds(@Param("menuItemIds") Collection<UUID> menuItemIds);

    boolean existsByIngredientId(UUID ingredientId);

    /** Đếm số dòng công thức cho một trang món, một query thay vì N. */
    @Query("""
        select r.menuItem.id, count(r) from Recipe r
        where r.menuItem.id in :menuItemIds
        group by r.menuItem.id
        """)
    List<Object[]> countByMenuItemIds(@Param("menuItemIds") Collection<UUID> menuItemIds);
}
