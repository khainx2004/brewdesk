// VNĐ là số nguyên, không có phần thập phân.
export function formatVnd(amount) {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

// Số tiền không kèm ký hiệu, dùng cho ô input hoặc bảng.
export function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(
    Number(value ?? 0),
  );
}

// Tồn kho lưu 3 chữ số thập phân nhưng bỏ số 0 thừa khi hiển thị.
export function formatQty(value) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(
    Number(value ?? 0),
  );
}

export function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(
    new Date(value),
  );
}

/**
 * Ngày dạng ngắn "20/7", dùng cho checklist — ở đó luôn là tuần/tháng hiện tại
 * nên năm chỉ tổ dài dòng.
 *
 * Cắt thẳng chuỗi `yyyy-MM-dd` của backend chứ **không** đi qua `new Date()`:
 * chuỗi ngày trần được JS hiểu là nửa đêm UTC, nên ở múi giờ âm sẽ lùi mất một
 * ngày. Việt Nam là UTC+7 nên hiện tại không lộ, nhưng đây đúng loại lỗi chỉ
 * hiện ra khi đổi máy chủ hoặc đổi múi giờ trình duyệt.
 */
export function formatDayMonth(value) {
  if (!value) return '';
  const [, month, day] = String(value).split('-');
  if (!month || !day) return String(value);
  return `${Number(day)}/${Number(month)}`;
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
