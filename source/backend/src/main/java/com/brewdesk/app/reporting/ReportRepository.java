package com.brewdesk.app.reporting;

import com.brewdesk.app.pos.Order;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn tổng hợp cho báo cáo. Toàn native (nhóm theo ngày giờ Việt Nam, dùng
 * FILTER, DISTINCT... không biểu diễn được bằng JPQL) — trả Object[] map ở
 * service. Extends JpaRepository&lt;Order&gt; chỉ để có bean repository; các câu
 * dưới độc lập với entity.
 */
public interface ReportRepository extends JpaRepository<Order, UUID> {

    /** Một dòng: doanh thu / số đơn / tiền mặt / chuyển khoản / giảm giá / huỷ. */
    @Query(
            value =
                    """
                    select
                      coalesce(sum(total) filter (where not is_cancelled), 0),
                      count(*) filter (where not is_cancelled),
                      coalesce(sum(total) filter (where not is_cancelled and payment_method = 'CASH'), 0),
                      coalesce(sum(total) filter (where not is_cancelled and payment_method = 'TRANSFER'), 0),
                      coalesce(sum(discount_amount) filter (where not is_cancelled), 0),
                      count(*) filter (where is_cancelled),
                      coalesce(sum(total) filter (where is_cancelled), 0)
                    from orders
                    where created_at >= :from and created_at < :to
                    """,
            nativeQuery = true)
    Object[] revenueSummary(
            @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    /** Doanh thu theo ngày (giờ Việt Nam), đơn không huỷ. */
    @Query(
            value =
                    """
                    select (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
                           coalesce(sum(total), 0), count(*)
                    from orders
                    where not is_cancelled and created_at >= :from and created_at < :to
                    group by day
                    order by day
                    """,
            nativeQuery = true)
    List<Object[]> revenueByDay(
            @Param("from") OffsetDateTime from, @Param("to") OffsetDateTime to);

    /** Món bán chạy theo số lượng, đơn không huỷ. */
    @Query(
            value =
                    """
                    select oi.menu_item_id, oi.item_name,
                           sum(oi.quantity), sum(oi.line_total)
                    from order_items oi
                    join orders o on o.id = oi.order_id
                    where not o.is_cancelled and o.created_at >= :from and o.created_at < :to
                    group by oi.menu_item_id, oi.item_name
                    order by sum(oi.quantity) desc, sum(oi.line_total) desc
                    limit :lim
                    """,
            nativeQuery = true)
    List<Object[]> topItems(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to,
            @Param("lim") int limit);

    /** Tồn kho hiện tại: nguyên liệu đang dùng, sắp hết xếp lên trước. */
    @Query(
            value =
                    """
                    select i.id, i.name, u.code, i.stock_qty, i.low_stock_threshold,
                           i.cost_price, (i.stock_qty * i.cost_price) as stock_value,
                           (i.stock_qty <= i.low_stock_threshold) as low_stock
                    from ingredients i
                    join units u on u.id = i.unit_id
                    where i.is_active = true
                    order by (i.stock_qty <= i.low_stock_threshold) desc, i.name
                    """,
            nativeQuery = true)
    List<Object[]> inventory();

    /** Hao hụt từ phiếu kiểm kê đã chốt, chỉ dòng có chênh lệch. */
    @Query(
            value =
                    """
                    select i.name, stl.system_qty, stl.actual_qty,
                           (stl.actual_qty - stl.system_qty) as variance,
                           ((stl.actual_qty - stl.system_qty) * i.cost_price) as variance_value,
                           sts.session_date
                    from stock_take_lines stl
                    join stock_take_sessions sts on sts.id = stl.session_id
                    join ingredients i on i.id = stl.ingredient_id
                    where sts.status = 'COMPLETED'
                      and sts.session_date >= :fromDate and sts.session_date <= :toDate
                      and stl.actual_qty is not null and stl.actual_qty <> stl.system_qty
                    order by sts.session_date desc, i.name
                    """,
            nativeQuery = true)
    List<Object[]> stockVariance(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);
}
