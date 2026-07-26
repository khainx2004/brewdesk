import { useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../../services/api';
import { shiftApi } from '../../services/posApi';
import { reconciliationApi } from '../../services/reconciliationApi';
import { staffApi } from '../../services/checklistApi';
import { useAuthStore } from '../../stores/authStore';

/** Hôm nay theo giờ máy, chỉ dùng làm giá trị mặc định cho ô chọn ngày. */
function todayInput() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Toàn bộ dữ liệu + thao tác của màn Bàn giao ca, tách ra để bản desktop
 * (`ReconciliationPage`) và bản mobile (`MobileReconciliationPage`) dùng chung —
 * hai màn chỉ khác bố cục, không được lệch logic đối soát tiền.
 */
export function useReconciliation() {
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

  // Phiếu đã lập trong ngày. Lấy cả ngày một lần rồi ghép theo ca ở client.
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

  // Phiếu đã chốt lấy thêm bản chi tiết (chỉ endpoint chi tiết mới tính lại POS
  // theo đơn hiện tại — `posAmountNow`).
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

  // Tải lại thủ công (không tự động) để không nhảy số dưới tay người đang đếm.
  const refresh = () => {
    setError(null);
    queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-suggest'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation-detail'] });
  };

  const saved = Object.values(savedByShift);
  // Ca chốt sau cùng trong ngày. Tiền mặt cuối ngày lẫn chuyển khoản đều lấy từ
  // đây chứ không cộng ba ca (ca sau kế thừa két ca trước; POS chuyển khoản đã
  // cộng dồn cả ngày) — cộng lại là tính đôi.
  const lastShift = saved.length
    ? saved
        .slice()
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
        .at(-1)
    : null;
  const daily = {
    cashLeft: lastShift?.actualAmount ?? 0,
    bank: lastShift?.posBankAmount ?? 0,
    spent: saved.reduce((sum, r) => sum + Number(r.spentAmount ?? 0), 0),
    withdrawn: saved.reduce((sum, r) => sum + Number(r.withdrawnAmount ?? 0), 0),
  };

  const offCount = saved.filter((r) => Number(r.difference) !== 0).length;
  const isRefreshing =
    listQuery.isFetching ||
    detailQueries.some((q) => q.isFetching) ||
    suggestionQueries.some((q) => q.isFetching);

  return {
    date,
    setDate,
    shifts,
    staff: staffQuery.data,
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
  };
}
