package com.brewdesk.app.pos;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    @Query("""
        select oi from OrderItem oi
        left join fetch oi.sweetnessVariant
        left join fetch oi.iceVariant
        where oi.order.id = :orderId
        order by oi.itemName asc
        """)
    List<OrderItem> findByOrderId(@Param("orderId") UUID orderId);

    /** Món của nhiều đơn trong một query, để panel Đơn hôm nay khỏi gọi N lần. */
    @Query("""
        select oi from OrderItem oi
        where oi.order.id in :orderIds
        order by oi.itemName asc
        """)
    List<OrderItem> findByOrderIdIn(@Param("orderIds") Collection<UUID> orderIds);

    /** Đếm số dòng cho cả một trang đơn bằng một query, không phải N query. */
    @Query("""
        select oi.order.id, sum(oi.quantity) from OrderItem oi
        where oi.order.id in :orderIds
        group by oi.order.id
        """)
    List<Object[]> countItemsByOrderIds(@Param("orderIds") Collection<UUID> orderIds);
}
