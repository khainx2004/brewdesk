package com.brewdesk.app.menu;

import com.brewdesk.app.menu.dto.VariantResponse;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VariantService {

    private final VariantRepository variantRepository;

    @Transactional(readOnly = true)
    public List<VariantResponse> listAll() {
        return variantRepository.findByActiveTrueOrderByVariantTypeAscDisplayOrderAsc().stream()
                .map(VariantResponse::from)
                .toList();
    }

    /** Gom theo loại để POS dựng thẳng 2 nhóm nút chọn mức ngọt và mức đá. */
    @Transactional(readOnly = true)
    public Map<VariantType, List<VariantResponse>> listGrouped() {
        return variantRepository.findByActiveTrueOrderByVariantTypeAscDisplayOrderAsc().stream()
                .collect(
                        Collectors.groupingBy(
                                Variant::getVariantType,
                                java.util.LinkedHashMap::new,
                                Collectors.mapping(VariantResponse::from, Collectors.toList())));
    }
}
