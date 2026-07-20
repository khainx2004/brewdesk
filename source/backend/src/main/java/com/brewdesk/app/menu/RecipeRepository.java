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

    boolean existsByIngredientId(UUID ingredientId);

    /** Đếm số dòng công thức cho một trang món, một query thay vì N. */
    @Query("""
        select r.menuItem.id, count(r) from Recipe r
        where r.menuItem.id in :menuItemIds
        group by r.menuItem.id
        """)
    List<Object[]> countByMenuItemIds(@Param("menuItemIds") Collection<UUID> menuItemIds);
}
