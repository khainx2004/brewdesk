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

    /**
     * "Profile pha hôm nay": lần test ĐÃ ĐẠT gần nhất cho mỗi ô (ca × loại hạt ×
     * liều). Không lưu ở đâu — suy từ chính các lần test đạt.
     *
     * <p>Native vì cần {@code DISTINCT ON} (lấy dòng đầu mỗi nhóm sau khi sắp
     * mới-nhất-trước) và phân loại hạt bằng tên nguyên liệu — cả hai đều không
     * biểu diễn được bằng JPQL. Ca: P1 = SANG, còn lại = CHIEU (mockup không có
     * dòng Tối). Chỉ lấy lần test có lô cà phê phân loại được Arabica/Robusta.
     *
     * <p>Trả Object[] map ở service, tránh rắc rối hoa/thường của alias khi dùng
     * interface projection với native query.
     */
    @Query(
            value =
                    """
                    select distinct on (
                        case when st.code = 'P1' then 'SANG' else 'CHIEU' end,
                        case when lower(i.name) like '%arabica%' then 'ARABICA'
                             when lower(i.name) like '%robusta%' then 'ROBUSTA' end,
                        s.dose_type)
                        case when st.code = 'P1' then 'SANG' else 'CHIEU' end   as ca,
                        case when lower(i.name) like '%arabica%' then 'ARABICA'
                             when lower(i.name) like '%robusta%' then 'ROBUSTA' end as bean,
                        s.dose_type, t.grind_setting, t.dose_gram, t.yield_gram,
                        t.extraction_seconds, t.boiler_temp_c, s.session_date,
                        u.full_name, t.id, t.created_at
                    from qc_tests t
                    join qc_test_sessions s on s.id = t.session_id
                    join shift_types st on st.id = s.shift_type_id
                    join users u on u.id = s.performed_by
                    join stock_imports si on si.id = t.stock_import_id
                    join ingredients i on i.id = si.ingredient_id
                    where t.passed = true
                      and s.session_date = :today
                      and (lower(i.name) like '%arabica%' or lower(i.name) like '%robusta%')
                    order by
                        case when st.code = 'P1' then 'SANG' else 'CHIEU' end,
                        case when lower(i.name) like '%arabica%' then 'ARABICA'
                             when lower(i.name) like '%robusta%' then 'ROBUSTA' end,
                        s.dose_type, s.session_date desc, s.created_at desc
                    """,
            nativeQuery = true)
    List<Object[]> findLatestPassedProfile(@Param("today") java.time.LocalDate today);
}
