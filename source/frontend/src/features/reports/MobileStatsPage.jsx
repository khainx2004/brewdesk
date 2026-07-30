import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { TABS, RANGES, rangeFor, prevRange } from './statsHelpers';
import { RevenuePane, InventoryPane, QcPane } from './StatsPage';

/**
 * Màn mobile "Thống kê" (chỉ ADMIN) — dùng lại nguyên các pane báo cáo của
 * `StatsPage` desktop (`RevenuePane`/`InventoryPane`/`QcPane`), chỉ thay khung
 * bằng topbar + tab chips mobile. CSS `.mstats` ép lưới KPI về 2 cột và cho bảng
 * rộng cuộn ngang thay vì tràn màn hình.
 */
export default function MobileStatsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('revenue');
  const [range, setRange] = useState('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = rangeFor(range, customFrom, customTo);
  const ready = Boolean(from && to);
  const prev = prevRange(from, to);

  const goBack = () => navigate('/m');
  const subtitle =
    tab === 'revenue'
      ? `Doanh thu · ${RANGES.find((r) => r[0] === range)[1]}`
      : tab === 'inventory'
        ? 'Kho nguyên liệu & hao hụt'
        : 'Lịch sử test cafe';

  return (
    <div className="mstats">
      <header className="mstats-top">
        <div className="mstats-toprow">
          <button type="button" className="mstats-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mstats-title">Thống kê</div>
            <div className="mstats-sub">{subtitle}</div>
          </div>
        </div>

        <div className="mstats-tabs">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              className={`mstats-tab${tab === k ? ' active' : ''}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'revenue' && (
          <div className="mstats-ranges">
            {RANGES.map(([k, label]) => (
              <button
                key={k}
                className={`mstats-chip${range === k ? ' active' : ''}`}
                onClick={() => setRange(k)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === 'revenue' && range === 'custom' && (
          <div className="mstats-custom">
            <span>Từ</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span>đến</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </header>

      <div className="mstats-scroll">
        {tab === 'revenue' && <RevenuePane from={from} to={to} prev={prev} ready={ready} />}
        {tab === 'inventory' && <InventoryPane />}
        {tab === 'qc' && <QcPane />}
      </div>

      <MobileTabBar />
    </div>
  );
}
