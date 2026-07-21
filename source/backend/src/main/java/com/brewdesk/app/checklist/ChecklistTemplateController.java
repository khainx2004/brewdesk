package com.brewdesk.app.checklist;

import com.brewdesk.app.checklist.dto.ChecklistTemplateRequest;
import com.brewdesk.app.checklist.dto.ChecklistTemplateResponse;
import com.brewdesk.app.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Checklist — đầu việc")
@RestController
@RequestMapping("/api/v1/checklist-templates")
@RequiredArgsConstructor
public class ChecklistTemplateController {

    private final ChecklistService checklistService;

    @Operation(summary = "Danh sách đầu việc")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ChecklistTemplateResponse>>> list(
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.ok(checklistService.listTemplates(includeInactive)));
    }

    @Operation(summary = "Chi tiết đầu việc")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChecklistTemplateResponse>> get(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(checklistService.getTemplate(id)));
    }

    @Operation(summary = "Tạo đầu việc (chỉ ADMIN)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ChecklistTemplateResponse>> create(
            @Valid @RequestBody ChecklistTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(checklistService.createTemplate(request), "Đã tạo đầu việc"));
    }

    @Operation(summary = "Sửa đầu việc (chỉ ADMIN)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ChecklistTemplateResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ChecklistTemplateRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        checklistService.updateTemplate(id, request), "Đã cập nhật đầu việc"));
    }

    @Operation(summary = "Ngừng áp dụng đầu việc (chỉ ADMIN)")
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ChecklistTemplateResponse>> deactivate(
            @PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        checklistService.setTemplateActive(id, false), "Đã ngừng áp dụng"));
    }

    @Operation(summary = "Áp dụng lại đầu việc (chỉ ADMIN)")
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ChecklistTemplateResponse>> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(
                ApiResponse.ok(checklistService.setTemplateActive(id, true), "Đã áp dụng lại"));
    }
}
