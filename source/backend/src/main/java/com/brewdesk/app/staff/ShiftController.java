package com.brewdesk.app.staff;

import com.brewdesk.app.common.dto.ApiResponse;
import com.brewdesk.app.staff.dto.CurrentShiftResponse;
import com.brewdesk.app.staff.dto.ShiftTypeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Ca làm việc")
@RestController
@RequestMapping("/api/v1/shift-types")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shiftService;

    @Operation(summary = "Danh sách ca làm việc")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ShiftTypeResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(shiftService.list()));
    }

    @Operation(
            summary = "Ca đang diễn ra theo giờ server",
            description =
                    "Ngoài giờ hoạt động thì shift là null và label là \"Ngoài giờ hoạt động\"."
                        + " Frontend không tự tính ca từ giờ máy client.")
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<CurrentShiftResponse>> current() {
        return ResponseEntity.ok(ApiResponse.ok(shiftService.current()));
    }
}
