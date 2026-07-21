import { create } from 'zustand';

/**
 * Giỏ hàng của đơn đang lập. Cố ý **không** lưu xuống storage: đơn dở dang qua
 * đêm mà hôm sau bấm Thanh toán thì bán nhầm giá và nhầm ca. Nhân viên gõ lại
 * vài món còn hơn.
 */

/**
 * Hai dòng gộp được với nhau khi trùng cả món, mức ngọt, mức đá và ghi chú.
 * Gộp cho giỏ gọn — backend cũng cộng dồn theo món khi trừ kho nên không lệch gì.
 */
function lineKey({ menuItemId, sweetnessVariantId, iceVariantId, note }) {
  return [menuItemId, sweetnessVariantId ?? '', iceVariantId ?? '', note ?? ''].join('|');
}

export const useCartStore = create((set, get) => ({
  lines: [],

  add(line) {
    const key = lineKey(line);
    const lines = get().lines;
    const existing = lines.find((l) => l.key === key);
    set({
      lines: existing
        ? lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l))
        : [...lines, { ...line, key }],
    });
  },

  setQuantity(key, quantity) {
    // Giảm xuống 0 thì bỏ dòng luôn, khỏi bắt bấm thêm nút Xoá.
    set({
      lines:
        quantity <= 0
          ? get().lines.filter((l) => l.key !== key)
          : get().lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
    });
  },

  remove(key) {
    set({ lines: get().lines.filter((l) => l.key !== key) });
  },

  clear() {
    set({ lines: [] });
  },
}));
