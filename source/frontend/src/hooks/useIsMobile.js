import { useSyncExternalStore } from 'react';

/**
 * Màn hình có đang ở khổ mobile không (hẹp hơn breakpoint `lg` 1180px của app…
 * nhưng ranh giới chuyển luồng đặt ở 880px cho khớp `@media` của màn đăng nhập
 * và để tablet ngang vẫn dùng bản desktop — quán không làm bản tablet riêng).
 *
 * <p>Dùng `matchMedia` + `useSyncExternalStore` nên tự cập nhật khi xoay máy /
 * đổi kích thước cửa sổ, không cần listener thủ công.
 */
const QUERY = '(max-width: 879px)';

function subscribe(callback) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // SSR/khởi tạo: coi như desktop
  );
}
