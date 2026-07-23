import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import AppShell from '../../components/layout/AppShell';
import { reportApi } from '../../services/reportApi';
import { qcApi } from '../../services/qcApi';
import { formatVnd, formatDayMonth, formatQty } from '../../utils/fmt';

const TABS = [
  ['revenue', 'Doanh thu'],
  ['inventory', 'Kho & Hao hụt'],
  ['qc', 'Test cafe'],
];
const RANGES = [
  ['today', 'Hôm nay'],
  ['7d', '7 ngày'],
  ['month', 'Tháng này'],
  ['custom', 'Tuỳ chỉnh'],
];

const pad = (n) => String(n).padStart(2, '0');
const iso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

/** Số tiền gọn cho KPI/biểu đồ: 18,4tr · 100k. Bảng thì dùng formatVnd đầy đủ. */
function compactVnd(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + 'tr';
  if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + 'k';
  return String(Math.round(v));
}

function rangeFor(key, customFrom, customTo) {
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
function prevRange(from, to) {
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

function pctDelta(cur, prev) {
  const c = Number(cur) || 0;
  const p = Number(prev) || 0;
  if (p === 0) return null;
  return Math.round(((c - p) / p) * 100);
}

export default function StatsPage() {
  const [tab, setTab] = useState('revenue');
  const [range, setRange] = useState('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = rangeFor(range, customFrom, customTo);
  const ready = Boolean(from && to);
  const prev = prevRange(from, to);

  const subtitle =
    tab === 'revenue'
      ? `Doanh thu · ${RANGES.find((r) => r[0] === range)[1]}`
      : tab === 'inventory'
        ? 'Kho nguyên liệu & hao hụt'
        : 'Lịch sử test cafe';

  return (
    <AppShell>
      <div className="flex flex-col">
        <div className="px-7 pt-5">
          <h1 className="font-display text-2xl italic text-ink-deep">Thống kê & Báo cáo</h1>
          <p className="mt-0.5 text-[12.5px] text-olive">{subtitle}</p>
        </div>

        <div className="stats-toolbar px-7 pt-4">
          <div className="cat-tabs">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                className={`cat-tab${tab === k ? ' active' : ''}`}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === 'revenue' && (
            <div className="range-chips">
              {RANGES.map(([k, label]) => (
                <button
                  key={k}
                  className={`range-chip${range === k ? ' active' : ''}`}
                  onClick={() => setRange(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === 'revenue' && range === 'custom' && (
          <div className="flex items-center gap-2 px-7 pt-3 text-[12px] text-olive">
            <span>Từ</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-lg border border-olive-mute bg-cream px-2 text-ink-deep outline-none focus:border-rogue"
            />
            <span>đến</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-lg border border-olive-mute bg-cream px-2 text-ink-deep outline-none focus:border-rogue"
            />
          </div>
        )}

        <div className="flex flex-col gap-[18px] px-7 pb-7 pt-4">
          {tab === 'revenue' && <RevenuePane from={from} to={to} prev={prev} ready={ready} />}
          {tab === 'inventory' && <InventoryPane />}
          {tab === 'qc' && <QcPane />}
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, delta, warn, sub }) {
  return (
    <div className={`kpi-card${warn ? ' warn' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta != null && (
        <div className={`kpi-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}`}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {Math.abs(delta)}% so với kỳ trước
        </div>
      )}
      {sub && <div className="kpi-delta flat">{sub}</div>}
    </div>
  );
}

function RevenuePane({ from, to, prev, ready }) {
  const revQuery = useQuery({
    queryKey: ['report-revenue', from, to],
    queryFn: () => reportApi.revenue({ from, to }),
    enabled: ready,
  });
  const prevQuery = useQuery({
    queryKey: ['report-revenue', prev?.from, prev?.to],
    queryFn: () => reportApi.revenue({ from: prev.from, to: prev.to }),
    enabled: ready && Boolean(prev),
  });
  const topQuery = useQuery({
    queryKey: ['report-top', from, to],
    queryFn: () => reportApi.topItems({ from, to, limit: 5 }),
    enabled: ready,
  });

  const d = revQuery.data;
  const p = prevQuery.data;
  if (!d) return <Loading />;

  const cancelTotal = d.orderCount + d.cancelledCount;
  const cancelRate = cancelTotal ? ((d.cancelledCount / cancelTotal) * 100).toFixed(1) : '0';
  const totalShiftRev = (d.byShift ?? []).reduce((s, x) => s + Number(x.revenue), 0);
  const maxDay = Math.max(1, ...(d.byDay ?? []).map((x) => Number(x.revenue)));
  const topItems = topQuery.data ?? [];
  const maxQty = Math.max(1, ...topItems.map((x) => Number(x.quantity)));

  return (
    <>
      <div className="kpi-grid">
        <Kpi
          label="Doanh thu"
          value={compactVnd(d.totalRevenue)}
          delta={p ? pctDelta(d.totalRevenue, p.totalRevenue) : null}
        />
        <Kpi
          label="Số đơn"
          value={d.orderCount}
          delta={p ? pctDelta(d.orderCount, p.orderCount) : null}
        />
        <Kpi
          label="Giá trị TB / đơn"
          value={compactVnd(d.avgOrderValue)}
          delta={p ? pctDelta(d.avgOrderValue, p.avgOrderValue) : null}
        />
        <Kpi
          label="Tỷ lệ huỷ đơn"
          value={`${cancelRate}%`}
          warn
          sub={`${d.cancelledCount} đơn / ${cancelTotal}`}
        />
      </div>

      <div className="stats-box">
        <div className="stats-title">Doanh thu theo ngày</div>
        <div className="stats-hint">
          {formatDayMonth(from)} – {formatDayMonth(to)}
        </div>
        {(d.byDay ?? []).length === 0 ? (
          <p className="text-[12.5px] text-olive">Chưa có đơn nào trong khoảng này.</p>
        ) : (
          <div className="chart-wrap">
            {d.byDay.map((x) => (
              <div key={x.date} className="bar-col">
                <div className="bar-value">{compactVnd(x.revenue)}</div>
                <div
                  className="bar"
                  style={{ height: `${Math.round((Number(x.revenue) / maxDay) * 140)}px` }}
                />
                <div className="bar-label">{formatDayMonth(x.date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="stats-box">
          <div className="stats-title">Top món bán chạy</div>
          <div className="stats-hint">Theo số lượng bán</div>
          {topItems.length === 0 ? (
            <p className="text-[12.5px] text-olive">Chưa có dữ liệu.</p>
          ) : (
            topItems.map((x, i) => (
              <div key={x.menuItemId ?? i} className="rank-row">
                <span className="rank-num">{i + 1}</span>
                <span className="rank-name">{x.itemName}</span>
                <div className="rank-track">
                  <div
                    className="rank-fill"
                    style={{ width: `${Math.round((Number(x.quantity) / maxQty) * 100)}%` }}
                  />
                </div>
                <span className="rank-value">{x.quantity}</span>
              </div>
            ))
          )}
        </div>

        <div className="stats-box">
          <div className="stats-title">Doanh thu theo ca</div>
          <div className="stats-hint">Tỷ trọng trong tổng doanh thu</div>
          {(d.byShift ?? []).length === 0 ? (
            <p className="text-[12.5px] text-olive">Chưa có dữ liệu.</p>
          ) : (
            d.byShift.map((x) => {
              const pct = totalShiftRev
                ? Math.round((Number(x.revenue) / totalShiftRev) * 100)
                : 0;
              return (
                <div key={x.shiftCode} className="rank-row">
                  <span className="rank-name">
                    {x.shiftName} · {x.shiftCode}
                  </span>
                  <div className="rank-track">
                    <div className="rank-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="rank-value">{pct}%</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function InventoryPane() {
  const invQuery = useQuery({ queryKey: ['report-inventory'], queryFn: reportApi.inventory });

  const d = new Date();
  const monthFrom = iso(new Date(d.getFullYear(), d.getMonth(), 1));
  const monthTo = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  const wasteQuery = useQuery({
    queryKey: ['report-waste', monthFrom, monthTo],
    queryFn: () => reportApi.stockVariance({ from: monthFrom, to: monthTo }),
  });

  const inv = invQuery.data;
  if (!inv) return <Loading />;

  const waste = wasteQuery.data ?? [];
  // Hao hụt = phần thiếu (variance âm). Cộng giá trị âm rồi lấy trị tuyệt đối.
  const wasteValue = waste
    .filter((w) => Number(w.variance) < 0)
    .reduce((s, w) => s + Math.abs(Number(w.varianceValue)), 0);
  const lowItems = inv.items.filter((i) => i.lowStock);

  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Giá trị tồn kho" value={compactVnd(inv.totalStockValue)} />
        <Kpi label="NL sắp hết" value={inv.lowStockCount} warn />
        <Kpi label="Giá trị hao hụt tháng" value={compactVnd(wasteValue)} warn />
        <Kpi
          label="Lần kiểm kê gần nhất"
          value={inv.lastStockTakeDate ? formatDayMonth(inv.lastStockTakeDate) : '—'}
        />
      </div>

      <div className="stats-box">
        <div className="stats-title">Cảnh báo sắp hết hàng</div>
        <div className="stats-hint">Nguyên liệu dưới ngưỡng tồn kho tối thiểu</div>
        {lowItems.length === 0 ? (
          <p className="text-[12.5px] text-olive">Không có nguyên liệu nào sắp hết.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nguyên liệu</th>
                <th>Tồn hiện tại</th>
                <th>Ngưỡng cảnh báo</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {lowItems.map((i) => {
                const crit = Number(i.stockQty) <= Number(i.lowStockThreshold) * 0.5;
                return (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>
                      {formatQty(i.stockQty)} {i.unitCode}
                    </td>
                    <td>
                      {formatQty(i.lowStockThreshold)} {i.unitCode}
                    </td>
                    <td>
                      <span className={`tag ${crit ? 'crit' : 'low'}`}>
                        {crit ? 'Rất thấp' : 'Sắp hết'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="stats-box">
        <div className="stats-title">Báo cáo hao hụt</div>
        <div className="stats-hint">
          Chênh tồn hệ thống và thực đếm — từ phiếu kiểm kê đã chốt trong tháng
        </div>
        {waste.length === 0 ? (
          <p className="text-[12.5px] text-olive">Chưa có phiếu kiểm kê nào chốt trong tháng.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nguyên liệu</th>
                <th>Tồn lý thuyết</th>
                <th>Tồn thực tế</th>
                <th>Chênh lệch</th>
                <th>Giá trị hao hụt</th>
              </tr>
            </thead>
            <tbody>
              {waste.map((w, i) => {
                const neg = Number(w.variance) < 0;
                return (
                  <tr key={i}>
                    <td>{w.ingredientName}</td>
                    <td>{formatQty(w.systemQty)}</td>
                    <td>{formatQty(w.actualQty)}</td>
                    <td className={neg ? 'neg' : ''}>
                      {Number(w.variance) > 0 ? '+' : ''}
                      {formatQty(w.variance)}
                    </td>
                    <td className={neg ? 'neg' : ''}>{formatVnd(w.varianceValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function QcPane() {
  const d = new Date();
  const from = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 29));
  const to = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate()));

  const [summaryQuery, listQuery] = useQueries({
    queries: [
      { queryKey: ['report-qc', from, to], queryFn: () => reportApi.qcSummary({ from, to }) },
      { queryKey: ['qc-history-stats'], queryFn: () => qcApi.list({ size: 50 }) },
    ],
  });

  const [fShift, setFShift] = useState('');
  const [fResult, setFResult] = useState('');
  const [fStaff, setFStaff] = useState('');

  const s = summaryQuery.data;

  // Phẳng hoá phiên → từng lần test cho danh sách lịch sử, giống mockup.
  const rows = useMemo(() => {
    const out = [];
    for (const sess of listQuery.data?.items ?? []) {
      for (const t of sess.tests ?? []) {
        out.push({
          id: t.id,
          shiftName: sess.shiftTypeName,
          staff: sess.performedByName,
          date: sess.sessionDate,
          passed: t.passed,
          note: t.note,
        });
      }
    }
    return out;
  }, [listQuery.data]);

  const staffNames = useMemo(() => [...new Set(rows.map((r) => r.staff))].filter(Boolean), [rows]);

  const filtered = rows.filter(
    (r) =>
      (!fShift || r.shiftName === fShift) &&
      (!fResult || (fResult === 'pass') === Boolean(r.passed)) &&
      (!fStaff || r.staff === fStaff),
  );

  const shiftNames = useMemo(
    () => [...new Set(rows.map((r) => r.shiftName))].filter(Boolean),
    [rows],
  );

  if (!s) return <Loading />;

  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Tổng lần test" value={s.totalTests} />
        <Kpi label="Tỷ lệ đạt" value={s.passRate != null ? `${s.passRate}%` : '—'} />
        <Kpi label="Không đạt" value={s.failCount} warn />
        <Kpi label="Test nhiều nhất" value={s.topTesterName ?? '—'} />
      </div>

      <div className="stats-box">
        <div className="stats-title">Lịch sử test cafe</div>
        <div className="stats-hint">Lọc theo ca / kết quả / nhân viên</div>
        <div className="filter-row">
          <select className="mini-select" value={fShift} onChange={(e) => setFShift(e.target.value)}>
            <option value="">Tất cả ca</option>
            {shiftNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <select
            className="mini-select"
            value={fResult}
            onChange={(e) => setFResult(e.target.value)}
          >
            <option value="">Tất cả kết quả</option>
            <option value="pass">Đạt</option>
            <option value="fail">Không đạt</option>
          </select>
          <select className="mini-select" value={fStaff} onChange={(e) => setFStaff(e.target.value)}>
            <option value="">Tất cả nhân viên</option>
            {staffNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="text-[12.5px] text-olive">Không có lần test nào khớp.</p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="hist-row">
              <span
                className="dot-status"
                style={{ background: r.passed ? 'var(--green)' : 'var(--wine)' }}
              />
              <span style={{ width: 70, color: 'var(--olive)' }}>{r.shiftName}</span>
              <span style={{ width: 90, fontWeight: 600 }}>{r.staff}</span>
              <span style={{ flex: 1, color: 'var(--ink-deep)' }}>{r.note || '—'}</span>
              <span style={{ color: 'var(--olive)' }}>{formatDayMonth(r.date)}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function Loading() {
  return <p className="px-1 py-8 text-center text-sm text-olive">Đang tải…</p>;
}
