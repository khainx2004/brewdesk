package com.brewdesk.app.inventory;

import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.inventory.dto.StockImportRequest;
import com.brewdesk.app.inventory.dto.StockImportResponse;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockImportService {

    private final StockImportRepository stockImportRepository;
    private final IngredientRepository ingredientRepository;
    private final SupplierRepository supplierRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    private final UnitConverter unitConverter;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<StockImportResponse> list(UUID ingredientId, Pageable pageable) {
        return PageResponse.from(
                stockImportRepository.search(ingredientId, pageable).map(StockImportResponse::from));
    }

    /**
     * Ghi phiếu nhập và cộng tồn trong cùng một transaction.
     *
     * <p>Đọc nguyên liệu bằng khoá ghi để hai lần nhập đồng thời không ghi đè tồn
     * của nhau. Phiếu lưu số lượng theo đơn vị lúc nhập, còn tồn kho cộng theo
     * đơn vị lưu kho của nguyên liệu — hai con số này có thể khác nhau.
     */
    @Transactional
    public StockImportResponse create(StockImportRequest request) {
        Ingredient ingredient =
                ingredientRepository
                        .findByIdForUpdate(request.ingredientId())
                        .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));
        if (!ingredient.isActive()) {
            throw new AppException(ErrorCode.INGREDIENT_INACTIVE);
        }

        Unit importUnit =
                unitRepository
                        .findById(request.unitId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));

        Supplier supplier = null;
        if (request.supplierId() != null) {
            supplier =
                    supplierRepository
                            .findById(request.supplierId())
                            .orElseThrow(() -> new AppException(ErrorCode.SUPPLIER_NOT_FOUND));
        }

        BigDecimal addedInStockUnit =
                unitConverter.convert(request.quantity(), importUnit, ingredient.getUnit());
        ingredient.setStockQty(ingredient.getStockQty().add(addedInStockUnit));
        ingredientRepository.save(ingredient);

        BigDecimal unitCost = request.unitCost() == null ? BigDecimal.ZERO : request.unitCost();
        BigDecimal totalCost =
                unitCost.multiply(request.quantity()).setScale(0, RoundingMode.HALF_UP);

        User importer =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        StockImport entry =
                StockImport.builder()
                        .ingredient(ingredient)
                        .supplier(supplier)
                        .unit(importUnit)
                        .batchCode(request.batchCode())
                        .quantity(request.quantity())
                        .unitCost(unitCost)
                        .totalCost(totalCost)
                        .expiryDate(request.expiryDate())
                        .importedAt(OffsetDateTime.now())
                        .importedBy(importer)
                        .note(request.note())
                        .build();
        StockImport saved = stockImportRepository.save(entry);

        auditService.record(
                "STOCK_IMPORT",
                "ingredients",
                ingredient.getId(),
                """
                {"quantity":"%s","unit":"%s","addedToStock":"%s","stockUnit":"%s","batchCode":%s}"""
                        .formatted(
                                request.quantity(),
                                importUnit.getCode(),
                                addedInStockUnit,
                                ingredient.getUnit().getCode(),
                                request.batchCode() == null
                                        ? "null"
                                        : "\"" + request.batchCode() + "\""));

        return StockImportResponse.from(saved);
    }
}
