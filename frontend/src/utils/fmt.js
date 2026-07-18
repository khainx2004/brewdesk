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

export function formatDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
