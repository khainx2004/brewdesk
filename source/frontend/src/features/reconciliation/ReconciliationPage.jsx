import { useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import { errorMessage } from '../../services/api';
import { shiftApi } from '../../services/posApi';
import { reconciliationApi } from '../../services/reconciliationApi';
import { staffApi } from '../../services/checklistApi';
import { useAuthStore } from '../../stores/authStore';
import { formatVnd, formatDayMonth } from '../../utils/fmt';
import ShiftCard from './ShiftCard';

/** Hôm nay theo giờ máy, chỉ dùng làm giá trị mặc định cho ô chọn ngày. */
function todayInput() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ReconciliationPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const queryClient = useQueryClient();

  const [date, setDate] = useState(todayInput);
  const [savingShift, setSavingShift] = useState(null);
  const [error, setError] = useState(null);

  const shiftsQuery = useQuery({ queryKey: ['shift-types'], queryFn: shiftApi.list });
  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const staffQuery = useQuery({
    queryKey: ['staff-list'],
    queryFn: staffApi.list,
    enabled: isAdmin,
  });

  // Phiếu đã lập trong ngày. Lấy cả ngày một lần rồi ghép theo ca ở client,
  // thay vì gọi ba lần.
  const listQuery = useQuery({
    queryKey: ['reconciliations', date],
    queryFn: () => reconciliationApi.list({ from: date, to: date, size: 10 }),
  });

  const savedByShift = useMemo(() => {
    const map = {};
    for (const item of listQuery.data?.items ?? []) {
      map[item.shiftTypeId] = item;
    }
    return map;
  }, [listQuery.data]);

  // Phiếu đã chốt thì lấy thêm bản chi tiết, vì chỉ endpoint chi tiết mới tính
  // lại POS theo đơn hiện tại (`posAmountNow`). Danh sách cố ý không tính lại —
  // quá đắt cho màn xem lướt nhiều trang — nhưng ở đây tối đa 3 phiếu một ngày
  // nên 3 lượt gọi là không đáng kể, mà đổi lại thấy được phiếu đã lệch so với
  // đơn hiện tại hay chưa.
  const detailQueries = useQueries({
    queries: shifts.map((s) => {
      const savedItem = savedByShift[s.id];
      return {
        queryKey: ['reconciliation-detail', savedItem?.id],
        queryFn: () => reconciliationApi.get(savedItem.id),
        enabled: Boolean(savedItem?.id),
      };
    }),
  });

  const detailByShift = {};
  shifts.forEach((s, i) => {
    detailByShift[s.id] = detailQueries[i]?.data;
  });

  // Ca chưa lập phiếu thì hỏi gợi ý: POS và tiền đầu ca hệ thống tính sẵn.
  const suggestionQueries = useQueries({
    queries: shifts.map((s) => ({
      queryKey: ['reconciliation-suggest', date, s.id],
      queryFn: () => reconciliationApi.suggest({ date, shiftTypeId: s.id }),
      enabled: shifts.length > 0 && !savedByShift[s.id],
    })),
  });

  const suggestionByShift = {};
  shifts.forEach((s, i) => {
    suggestionByShift[s.id] = suggestionQueries[i]?.data;
  });

  const save = async (shift, body) => {
    setSavingShift(shift.id);
    setError(null);
    try {
      const saved = savedByShift[shift.id];
      if (saved) {
        await reconciliationApi.update(saved.id, body);
      } else {
        await reconciliationApi.create({ ...body, date, shiftTypeId: shift.id });
      }
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-suggest'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-detail'] });
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setSavingShift(null);
    }
  };

  /**
   * Tải lại thủ công thay vì tự động theo chu kỳ.
   *
   * <p>Số POS và tiền đầu ca đổi khi có đơn mới hoặc đơn bị huỷ ở màn POS. Nhưng
   * tự làm mới nền giữa lúc người dùng đang gõ số đếm tiền sẽ làm số nhảy dưới
   * tay họ — với màn đối soát tiền thì đó là cách nhanh nhất để mất tin. Thẻ nào
   * đang gõ dở cũng không bị nạp đè, xem `dirtyRef` trong ShiftCard.
   */
  const refresh = () => {
    setError(null);
    queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-suggest'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-detail'] });
  };

  const saved = Object.values(savedByShift);
  const daily = {
    // Tiền mặt còn lại cuối ngày = số thực đếm của ca chốt sau cùng, không phải
    // tổng ba ca — cộng lại là tính đôi vì ca sau kế thừa két của ca trước.
    cashLeft: saved.length
      ? saved
          .slice()
          .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
          .at(-1).actualAmount
      : 0,
    bank: saved.reduce((sum, r) => sum + Number(r.posBankAmount ?? 0), 0),
    spent: saved.reduce((sum, r) => sum + Number(r.spentAmount ?? 0), 0),
    withdrawn: saved.reduce((sum, r) => sum + Number(r.withdrawnAmount ?? 0), 0),
  };

  const offCount = saved.filter((r) => Number(r.difference) !== 0).length;
  const isRefreshing =
    listQuery.isFetching ||
    detailQueries.some((q) => q.isFetching) ||
    suggestionQueries.some((q) => q.isFetching);

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
              staff={staffQuery.data}
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
            <DailyCard label="Chuyển khoản" value={daily.bank} hint="Máy ghi nhận cả ngày" />
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
      {hint && <p className="mt-0.5 text-[10.5px] text-olive/80">{hint}</p>}
    </div>
  );
}
