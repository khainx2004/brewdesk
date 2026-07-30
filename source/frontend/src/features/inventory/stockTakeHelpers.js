/**
 * Helper gom nhóm nguyên liệu theo danh mục cho màn Kiểm kê kho — dùng chung bản
 * desktop (`StockTakePage`) và bản mobile (`MobileStockTakePage`).
 */

/**
 * Thứ tự và nhãn nhóm lấy y hệt mockup Kiểm kê kho: [tên nhóm trong DB, nhãn hiển
 * thị đúng mockup]. Nhóm nào không nằm trong mockup (vd Bánh) đẩy xuống cuối và
 * giữ tên DB.
 */
export const CATEGORY_ORDER = [
  ['Cà phê', 'Coffee'],
  ['Bột', 'Powder'],
  ['Trà', 'Tea'],
  ['Chất tạo ngọt', 'Sweet'],
  ['Sữa', 'Milk & Rượu'],
  ['Siro', 'Syrup'],
  ['Tự làm tại quán', 'Homemade'],
  ['Topping', 'Topping'],
  ['Vệ sinh', 'Cleaning'],
  ['Đồ rót / pha chế', 'Pour <3'],
];

/** Gom nguyên liệu theo nhóm, xếp đúng thứ tự và tên nhóm của mockup. */
export function groupByCategory(items) {
  const byName = new Map();
  for (const it of items) {
    const key = it.categoryName || 'Khác';
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(it);
  }
  const result = [];
  const used = new Set();
  for (const [dbName, label] of CATEGORY_ORDER) {
    if (byName.has(dbName)) {
      result.push({ name: label, items: byName.get(dbName) });
      used.add(dbName);
    }
  }
  for (const [dbName, list] of byName) {
    if (!used.has(dbName)) result.push({ name: dbName, items: list });
  }
  return result;
}
