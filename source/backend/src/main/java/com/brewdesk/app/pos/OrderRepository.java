package com.brewdesk.app.pos;

import com.brewdesk.app.pos.dto.CashSummary;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    /**
     * Số kế tiếp cho mã đơn. Lấy từ sequence chứ không đếm bảng orders: nextval
     * chạy ngoài transaction nên hai máy bấm Thanh toán cùng lúc vẫn nhận hai số
     * khác nhau, không phải khoá bảng và không đụng unique constraint.
     */
    @Query(value = "select nextval('order_code_seq')", nativeQuery = true)
    long nextOrderCodeSeq();

    @Query("""
        select o from Order o
        left join fetch o.shiftType
        join fetch o.createdBy
        left join fetch o.cancelledBy
        where o.id = :id
        """)
    Optional<Order> findDetailById(@Param("id") UUID id);

    /**
     * <b>Không tham số nào được phép null.</b> PostgreSQL không suy được kiểu của
     * một tham số chỉ xuất hiện trong {@code ? is null} và báo
     * {@code could not determine data type of parameter} — cùng họ với lỗi
     * {@code lower(bytea)} đã dính ở Phase 3, chỉ khác thông báo.
     *
     * <p>Nên "không lọc" được biểu diễn bằng giá trị canh biên thay vì null:
     * service truyền mốc thời gian rộng nhất, chuỗi rỗng cho mã đơn, và cờ
     * {@code filterShift} riêng để {@code shiftTypeId} luôn có giá trị thật.
     */
    @Query("""
        select o from Order o
        left join fetch o.shiftType
        join fetch o.createdBy
        where o.createdAt >= :from
          and o.createdAt < :to
          and (:filterShift = false or o.shiftType.id = :shiftTypeId)
          and (:includeCancelled = true or o.cancelled = false)
          and (:code = '' or lower(o.orderCode) like lower(concat('%', :code, '%')))
        """)
    Page<Order> search(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to,
            @Param("filterShift") boolean filterShift,
            @Param("shiftTypeId") UUID shiftTypeId,
            @Param("includeCancelled") boolean includeCancelled,
            @Param("code") String code,
            Pageable pageable);

    /**
     * Tổng tiền và số đơn theo một hình thức thanh toán, trong một ca của một
     * ngày. Bàn giao ca dùng số này làm dòng POS — số máy ghi nhận được, để đối
     * chiếu với tiền thực đếm trong két.
     *
     * <p>Đơn đã huỷ không tính.
     */
    @Query("""
        select new com.brewdesk.app.pos.dto.CashSummary(sum(o.total), count(o))
        from Order o
        where o.cancelled = false
          and o.paymentMethod = :method
          and o.shiftType.id = :shiftTypeId
          and o.createdAt >= :from
          and o.createdAt < :to
        """)
    CashSummary sumByShift(
            @Param("method") PaymentMethod method,
            @Param("shiftTypeId") UUID shiftTypeId,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);

    /**
     * Tổng cộng dồn từ đầu ngày tới hết ca này — dùng cho phần chuyển khoản của
     * bàn giao ca.
     *
     * <p>Tiền mặt bàn giao theo từng ca vì két được trao tay mỗi ca, nhưng
     * chuyển khoản dồn vào một tài khoản nên chủ quán đọc số cộng dồn cả ngày:
     * ca sáng nhận 800k, ca chiều nhận thêm 150k thì app ngân hàng hiện 950k, và
     * POS phải hiện 950k để khớp. Cộng theo các ca có giờ bắt đầu ≤ ca này.
     *
     * <p>Đơn đã huỷ không tính.
     */
    @Query("""
        select new com.brewdesk.app.pos.dto.CashSummary(sum(o.total), count(o))
        from Order o
        where o.cancelled = false
          and o.paymentMethod = :method
          and o.createdAt >= :from
          and o.createdAt < :to
          and o.shiftType.startTime <= :throughStart
        """)
    CashSummary sumThroughShift(
            @Param("method") PaymentMethod method,
            @Param("throughStart") java.time.LocalTime throughStart,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);
}
