package com.brewdesk.app.staff;

import com.brewdesk.app.staff.dto.CurrentShiftResponse;
import com.brewdesk.app.staff.dto.ShiftTypeResponse;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
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
