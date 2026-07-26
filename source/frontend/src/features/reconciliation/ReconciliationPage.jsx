import { RotateCw } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import { formatVnd, formatDayMonth } from '../../utils/fmt';
import ShiftCard from './ShiftCard';
import { useReconciliation } from './useReconciliation';

export default function ReconciliationPage() {
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
    <AppShell>
      <div className="flex flex-col px-7 pb-7 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl italic text-ink-deep">Bàn giao ca</h1>
            <p className="mt-0.5 text-[12.5px] text-olive">
              {formatDayMonth(date)} · {saved.length}/{shifts.length} ca đã chốt
              {offCount > 0 && (
                <span className="ml-1.5 font-semibold text-wine">
                  · {offCount} ca lệch
                </span>
              )}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={refresh}
              loading={isRefreshing}
              title="Tải lại số POS và tiền đầu ca"
            >
              <RotateCw size={13} strokeWidth={2} />
              Tải lại
            </Button>
            <label className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-olive">
              Ngày
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 rounded-lg border border-olive-mute bg-cream px-2.5 text-[13px] text-ink-deep outline-none focus:border-rogue"
            />
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-wine/30 bg-wine/8 px-3.5 py-2.5 text-[12.5px] text-wine">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
        </div>

        <div className="mt-5 rounded-2xl border border-olive-mute/60 bg-cream p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-ink-deep">Tổng hợp toàn ngày</h2>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <DailyCard
              label="Tiền mặt cuối ngày"
              value={daily.cashLeft}
              hint="Số thực đếm của ca chốt sau cùng"
            />
            <DailyCard label="Chuyển khoản" value={daily.bank} hint="Cộng dồn cả ngày" />
            <DailyCard label="Tổng chi" value={daily.spent} />
            <DailyCard label="Đã rút tiền mặt" value={daily.withdrawn} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DailyCard({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-batter-lt px-4 py-3.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-olive">
        {label}
      </div>
      <div className="mt-1 font-display text-[22px] italic text-ink-deep">
        {formatVnd(value)}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-olive/55">{hint}</p>}
    </div>
  );
}
