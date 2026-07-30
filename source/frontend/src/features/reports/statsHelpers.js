/**
 * Hằng số + hàm tính toán thuần cho màn Thống kê — dùng chung bản desktop
 * (`StatsPage`) và bản mobile (`MobileStatsPage`). Tách khỏi file component để
 * không lẫn export không-phải-component (giữ fast-refresh sạch).
 */

export const TABS = [
  ['revenue', 'Doanh thu'],
  ['inventory', 'Kho & Hao hụt'],
  ['qc', 'Test cafe'],
];
export const RANGES = [
  ['today', 'Hôm nay'],
  ['7d', '7 ngày'],
  ['month', 'Tháng này'],
  ['custom', 'Tuỳ chỉnh'],
];

const pad = (n) => String(n).padStart(2, '0');
export const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/** Số tiền gọn cho KPI/biểu đồ: 18,4tr · 100k. Bảng thì dùng formatVnd đầy đủ. */
export function compactVnd(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + 'tr';
  if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + 'k';
  return String(Math.round(v));
}

export function rangeFor(key, customFrom, customTo) {
  const d = new Date();
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (key === 'today') return { from: iso(today), to: iso(today) };
  if (key === '7d') {
    const f = new Date(today);
    f.setDate(f.getDate() - 6);
    return { from: iso(f), to: iso(today) };
  }
  if (key === 'month') {
    const f = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: iso(f), to: iso(today) };
  }
  return { from: customFrom, to: customTo };
}

/** Kỳ liền trước cùng độ dài, để tính delta ▲▼. */
export function prevRange(from, to) {
  if (!from || !to) return null;
  const f = new Date(from);
  const t = new Date(to);
  const len = Math.round((t - f) / 86400000) + 1;
  const pt = new Date(f);
  pt.setDate(pt.getDate() - 1);
  const pf = new Date(pt);
  pf.setDate(pf.getDate() - (len - 1));
  return { from: iso(pf), to: iso(pt) };
}

export function pctDelta(cur, prev) {
  const c = Number(cur) || 0;
  const p = Number(prev) || 0;
  if (p === 0) return null;
  return Math.round(((c - p) / p) * 100);
}
