/**
 * Helper dùng chung cho màn Nhân viên (bản desktop `StaffPage` và bản mobile
 * `MobileStaffPage`). Tách ra một chỗ để hai màn dùng chung, không chép đôi.
 */

/** Viết tắt tên: lấy 2 ký tự đầu của từ cuối (vd "Nguyễn Văn A" → "A"). */
export function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
}

/** Gợi ý tên đăng nhập từ họ tên: bỏ dấu, thường hoá, chỉ giữ chữ/số/./_. */
export function slugUsername(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '');
}

/** Mật khẩu tạm 8 ký tự, bỏ ký tự dễ nhìn nhầm — hợp ràng buộc backend (≥8, chữ/số). */
export function genTempPass() {
  const cs = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i += 1) s += cs[Math.floor(Math.random() * cs.length)];
  return s;
}
