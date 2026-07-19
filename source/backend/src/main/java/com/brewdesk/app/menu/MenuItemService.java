package com.brewdesk.app.menu;

import com.brewdesk.app.common.audit.Auditable;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.menu.dto.MenuItemRequest;
import com.brewdesk.app.menu.dto.MenuItemResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<MenuItemResponse> search(
            UUID categoryId, String keyword, boolean includeInactive, Pageable pageable) {
        String normalized = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        var page = menuItemRepository.search(categoryId, normalized, includeInactive, pageable);
        return PageResponse.from(page.map(MenuItemResponse::from));
    }

    @Transactional(readOnly = true)
    public MenuItemResponse get(UUID id) {
        return MenuItemResponse.from(findOrThrow(id));
    }

    @Transactional
    public MenuItemResponse create(MenuItemRequest request) {
        Category category = findActiveCategory(request.categoryId());

        if (menuItemRepository.existsByNameIgnoreCaseAndCategoryId(
                request.name(), request.categoryId())) {
            throw new AppException(ErrorCode.MENU_ITEM_NAME_EXISTS);
        }

        MenuItem item =
                MenuItem.builder()
                        .category(category)
                        .name(request.name())
                        .description(request.description())
                        .price(request.price())
                        .active(true)
                        .displayOrder(request.displayOrder())
                        .build();
        return MenuItemResponse.from(menuItemRepository.save(item));
    }

    @Transactional
    @Auditable(action = "UPDATE_MENU_ITEM", entityType = "menu_items")
    public MenuItemResponse update(UUID id, MenuItemRequest request) {
        MenuItem item = findOrThrow(id);
        Category category = findActiveCategory(request.categoryId());

        if (menuItemRepository.existsByNameIgnoreCaseAndCategoryIdAndIdNot(
                request.name(), request.categoryId(), id)) {
            throw new AppException(ErrorCode.MENU_ITEM_NAME_EXISTS);
        }

        item.setCategory(category);
        item.setName(request.name());
        item.setDescription(request.description());
        item.setPrice(request.price());
        item.setDisplayOrder(request.displayOrder());
        return MenuItemResponse.from(menuItemRepository.save(item));
    }

    /** Ngừng bán thay vì xoá, để đơn cũ vẫn tra ngược được món. */
    @Transactional
    @Auditable(action = "DEACTIVATE_MENU_ITEM", entityType = "menu_items")
    public MenuItemResponse deactivate(UUID id) {
        MenuItem item = findOrThrow(id);
        item.setActive(false);
        return MenuItemResponse.from(menuItemRepository.save(item));
    }

    @Transactional
    public MenuItemResponse activate(UUID id) {
        MenuItem item = findOrThrow(id);
        if (!item.getCategory().isActive()) {
            throw new AppException(ErrorCode.CATEGORY_INACTIVE);
        }
        item.setActive(true);
        return MenuItemResponse.from(menuItemRepository.save(item));
    }

    private MenuItem findOrThrow(UUID id) {
        return menuItemRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MENU_ITEM_NOT_FOUND));
    }

    private Category findActiveCategory(UUID categoryId) {
        Category category =
                categoryRepository
                        .findById(categoryId)
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND));
        if (!category.isActive()) {
            throw new AppException(ErrorCode.CATEGORY_INACTIVE);
        }
        return category;
    }
}
