package com.brewdesk.app.staff;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.staff.dto.CurrentShiftResponse;
import com.brewdesk.app.staff.dto.ShiftTypeResponse;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Xác định ca làm việc theo giờ <b>server</b>.
 *
 * <p>CLAUDE.md mục 6 cấm tin giờ client gửi lên: máy pha chế đặt sai giờ sẽ ghi
 * đơn vào nhầm ca, và bàn giao ca cuối ngày sẽ lệch tiền mà không ai biết vì sao.
 */
@Service
@RequiredArgsConstructor
public class ShiftService {

    /**
     * Chốt cứng múi giờ Việt Nam thay vì dùng giờ mặc định của máy. VPS thường
     * chạy UTC, mà UTC lúc 14:00 là 21:00 giờ Việt Nam — lệch đúng một ca.
     */
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final String OUT_OF_HOURS = "Ngoài giờ hoạt động";

    private final ShiftTypeRepository shiftTypeRepository;

    public LocalTime now() {
        return LocalTime.now(ZONE);
    }

    /** Ngày làm việc theo giờ quán, không theo giờ máy chủ. */
    public LocalDate today() {
        return LocalDate.now(ZONE);
    }

    /** Mốc đầu ngày làm việc, dùng để lọc đơn theo ngày trong bàn giao ca. */
    public OffsetDateTime startOfDay(LocalDate date) {
        return date.atStartOfDay(ZONE).toOffsetDateTime();
    }

    /**
     * Ca cho một nghiệp vụ bắt buộc phải có ca (test cafe, bàn giao ca).
     *
     * <p>Client được phép chỉ định ca — ví dụ nhập bù phiếu bàn giao ca sáng vào
     * buổi chiều. Không chỉ định thì lấy ca hiện tại theo giờ server; ngoài giờ
     * hoạt động thì báo lỗi thay vì đoán bừa, vì gán nhầm ca làm lệch cả tiền
     * bàn giao lẫn thống kê chất lượng.
     */
    @Transactional(readOnly = true)
    public ShiftType requireShift(UUID shiftTypeId) {
        if (shiftTypeId != null) {
            return shiftTypeRepository
                    .findById(shiftTypeId)
                    .orElseThrow(() -> new AppException(ErrorCode.SHIFT_TYPE_NOT_FOUND));
        }
        return currentShift().orElseThrow(() -> new AppException(ErrorCode.SHIFT_REQUIRED));
    }

    /**
     * Ca chứa thời điểm hiện tại, hoặc rỗng nếu ngoài giờ hoạt động.
     *
     * <p>Khoảng nửa mở [start, end) nên mốc 13:00 thuộc ca Chiều chứ không thuộc
     * cả hai ca, và 21:00 đúng lúc đóng cửa đã là ngoài giờ.
     */
    @Transactional(readOnly = true)
    public Optional<ShiftType> currentShift() {
        LocalTime now = now();
        return shiftTypeRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .filter(s -> !now.isBefore(s.getStartTime()) && now.isBefore(s.getEndTime()))
                .findFirst();
    }

    @Transactional(readOnly = true)
    public CurrentShiftResponse current() {
        return currentShift()
                .map(s -> new CurrentShiftResponse(ShiftTypeResponse.from(s), s.getName(), now()))
                .orElseGet(() -> new CurrentShiftResponse(null, OUT_OF_HOURS, now()));
    }

    @Transactional(readOnly = true)
    public List<ShiftTypeResponse> list() {
        return shiftTypeRepository.findByActiveTrueOrderByDisplayOrderAsc().stream()
                .map(ShiftTypeResponse::from)
                .toList();
    }
}
