import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RotateCw } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { formatVnd, formatDayMonth } from '../../utils/fmt';
import ShiftCard from './ShiftCard';
import { useReconciliation } from './useReconciliation';

/**
 * Màn Bàn giao ca bản mobile — suy ra từ `ReconciliationPage`, dùng chung hook
 * `useReconciliation` và tái dùng nguyên `ShiftCard` (vốn đã hợp cột hẹp). Chỉ
 * đổi khung: topbar mobile + các thẻ ca xếp dọc + tổng hợp ngày + tab bar dưới.
 */
export default function MobileReconciliationPage() {
  const navigate = useNavigate();
  const {
    date,
    setDate,
    shifts,
    staff,
    savedByShift,
    suggestionByShift,
    detailByShift,
    save,
    refresh,
    savingShift,
    error,
    saved,
    daily,
    offCount,
    isRefreshing,
  } = useReconciliation();

  return (
    <div className="mrecon">
      <header className="mrecon-top">
        <div className="mrecon-toprow">
          <button type="button" className="mrecon-back" onClick={() => navigate('/m')} aria-label="Về trang chính">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mrecon-title">Bàn giao ca</div>
            <div className="mrecon-sub">
              {formatDayMonth(date)} · {saved.length}/{shifts.length} ca đã chốt
              {offCount > 0 && <span className="text-wine font-semibold"> · {offCount} ca lệch</span>}
            </div>
          </div>
          <button
            type="button"
            className="mrecon-refresh"
            onClick={refresh}
            disabled={isRefreshing}
            title="Tải lại số POS và tiền đầu ca"
            aria-label="Tải lại"
          >
            <RotateCw size={15} strokeWidth={2} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mrecon-date"
          aria-label="Ngày bàn giao"
        />
      </header>

      {error && <div className="mrecon-err">{error}</div>}

      <div className="mrecon-scroll">
        {shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            saved={detailByShift[shift.id] ?? savedByShift[shift.id]}
            suggestion={suggestionByShift[shift.id]}
            staff={staff}
            saving={savingShift === shift.id}
            onSave={(body) => save(shift, body)}
          />
        ))}

        <div className="mt-1 rounded-2xl border border-olive-mute/60 bg-cream p-4 shadow-card">
          <h2 className="mb-3 text-[13.5px] font-bold text-ink-deep">Tổng hợp toàn ngày</h2>
          <div className="grid grid-cols-2 gap-3">
            <DailyCard label="Tiền mặt cuối ngày" value={daily.cashLeft} hint="Ca chốt sau cùng" />
            <DailyCard label="Chuyển khoản" value={daily.bank} hint="Cộng dồn cả ngày" />
            <DailyCard label="Tổng chi" value={daily.spent} />
            <DailyCard label="Đã rút tiền mặt" value={daily.withdrawn} />
          </div>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
}

function DailyCard({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-batter-lt px-3.5 py-3">
      <div className="text-[9.5px] font-bold uppercase tracking-[0.06em] text-olive">{label}</div>
      <div className="mt-1 font-display text-[19px] italic text-ink-deep">{formatVnd(value)}</div>
      {hint && <p className="mt-0.5 text-[10px] text-olive/55">{hint}</p>}
    </div>
  );
}
