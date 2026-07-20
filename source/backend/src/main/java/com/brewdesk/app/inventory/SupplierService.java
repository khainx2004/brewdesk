package com.brewdesk.app.inventory;

import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.inventory.dto.SupplierRequest;
import com.brewdesk.app.inventory.dto.SupplierResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> list(boolean includeInactive, Pageable pageable) {
        var page =
                includeInactive
                        ? supplierRepository.findAll(pageable)
                        : supplierRepository.findByActiveTrue(pageable);
        return PageResponse.from(page.map(SupplierResponse::from));
    }

    @Transactional
    public SupplierResponse create(SupplierRequest request) {
        if (supplierRepository.existsByNameIgnoreCase(request.name())) {
            throw new AppException(ErrorCode.SUPPLIER_NAME_EXISTS);
        }
        Supplier supplier =
                Supplier.builder()
                        .name(request.name())
                        .phone(request.phone())
                        .address(request.address())
                        .note(request.note())
                        .active(true)
                        .build();
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierResponse update(UUID id, SupplierRequest request) {
        Supplier supplier = findOrThrow(id);
        if (supplierRepository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new AppException(ErrorCode.SUPPLIER_NAME_EXISTS);
        }
        supplier.setName(request.name());
        supplier.setPhone(request.phone());
        supplier.setAddress(request.address());
        supplier.setNote(request.note());
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    /** Ngừng dùng thay vì xoá, để phiếu nhập cũ vẫn tra ngược được nhà cung cấp. */
    @Transactional
    public SupplierResponse setActive(UUID id, boolean active) {
        Supplier supplier = findOrThrow(id);
        supplier.setActive(active);
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    private Supplier findOrThrow(UUID id) {
        return supplierRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUPPLIER_NOT_FOUND));
    }
}
