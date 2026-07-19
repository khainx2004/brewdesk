package com.brewdesk.app.menu;

import com.brewdesk.app.common.audit.Auditable;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.menu.dto.CategoryRequest;
import com.brewdesk.app.menu.dto.CategoryResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;

    @Transactional(readOnly = true)
    public PageResponse<CategoryResponse> list(boolean includeInactive, Pageable pageable) {
        var page =
                includeInactive
                        ? categoryRepository.findAll(pageable)
                        : categoryRepository.findByActiveTrue(pageable);
        return PageResponse.from(page.map(CategoryResponse::from));
    }

    @Transactional(readOnly = true)
    public CategoryResponse get(UUID id) {
        return CategoryResponse.from(findOrThrow(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        if (categoryRepository.existsByNameIgnoreCase(request.name())) {
            throw new AppException(ErrorCode.CATEGORY_NAME_EXISTS);
        }
        Category category =
                Category.builder()
                        .name(request.name())
                        .displayOrder(request.displayOrder())
                        .active(true)
                        .build();
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(UUID id, CategoryRequest request) {
        Category category = findOrThrow(id);
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new AppException(ErrorCode.CATEGORY_NAME_EXISTS);
        }
        category.setName(request.name());
        category.setDisplayOrder(request.displayOrder());
        return CategoryResponse.from(categoryRepository.save(category));
    }

    /** Ngừng hoạt động thay vì xoá, để món cũ và đơn cũ vẫn tra ngược được danh mục. */
    @Transactional
    @Auditable(action = "DEACTIVATE_CATEGORY", entityType = "categories")
    public CategoryResponse deactivate(UUID id) {
        Category category = findOrThrow(id);
        if (menuItemRepository.existsByCategoryIdAndActiveTrue(id)) {
            throw new AppException(ErrorCode.CATEGORY_HAS_ACTIVE_ITEMS);
        }
        category.setActive(false);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse activate(UUID id) {
        Category category = findOrThrow(id);
        category.setActive(true);
        return CategoryResponse.from(categoryRepository.save(category));
    }

    private Category findOrThrow(UUID id) {
        return categoryRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
    }
}
