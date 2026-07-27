import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import { errorMessage } from '../../services/api';
import { qcApi } from '../../services/qcApi';
import { ingredientApi } from '../../services/inventoryApi';
import { useShift } from '../../hooks/useShift';
import TestEntry from './TestEntry';
import ProfileBlock from './ProfileBlock';
import HistorySession from './HistorySession';
import { blankEntry, toPayload, validate } from './qcSession';

export default function QcPage() {
  const queryClient = useQueryClient();
  const { shift, label: shiftLabel } = useShift();

  const [doseType, setDoseType] = useState('DOUBLE');
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const stockQuery = useQuery({ queryKey: ['stock-imports'], queryFn: qcApi.stockImports });
  const ingredientsQuery = useQuery({
    queryKey: ['ingredients', 'qc-coffee'],
    queryFn: () => ingredientApi.list({ size: 500 }),
  });
  // "Lô cà phê" chỉ liệt kê lô của nguyên liệu nhóm Cà phê — QC là test espresso,
  // chọn lô sữa/siro là vô nghĩa. StockImportResponse không có nhóm nên đối chiếu
  // qua danh sách nguyên liệu.
  const stockImports = useMemo(() => {
    const coffeeIds = new Set(
      (ingredientsQuery.data?.items ?? [])
        .filter((i) => i.categoryName === 'Cà phê')
        .map((i) => i.id),
    );
    return (stockQuery.data?.items ?? []).filter((s) => coffeeIds.has(s.ingredientId));
  }, [stockQuery.data, ingredientsQuery.data]);

  const profileQuery = useQuery({ queryKey: ['qc-profile'], queryFn: qcApi.profile });

  // Lịch sử gồm hôm nay và ngày test gần nhất trước đó — đủ hai ngày để đối
  // chiếu, không kéo các ngày cũ hơn.
  const historyQuery = useQuery({
    queryKey: ['qc-history-recent'],
    queryFn: qcApi.recent,
  });
  const sessions = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      qcApi.create({
        // Ngày và ca để backend tự lấy theo giờ server; ngoài giờ thì gửi ca đang
        // xem để bảng bắt ca không rỗng.
        shiftTypeId: shift?.id ?? undefined,
        doseType,
        note: note.trim() || null,
        tests: entries.map(toPayload),
      }),
    onSuccess: () => {
      setEntries([]);
      setNote('');
      setError(null);
      // Test mới của hôm nay vào cả Profile hôm nay lẫn lịch sử (lịch sử có hôm nay).
      queryClient.invalidateQueries({ queryKey: ['qc-profile'] });
      queryClient.invalidateQueries({ queryKey: ['qc-history-recent'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const submit = () => {
    const problem = validate(entries);
    if (problem) {
      setError(problem);
      return;
    }
    save.mutate();
  };

  const updateEntry = (key, next) =>
    setEntries((list) => list.map((e) => (e.key === key ? next : e)));
  const removeEntry = (key) => setEntries((list) => list.filter((e) => e.key !== key));

  // Tổng số lần test trong lịch sử (hôm nay + ngày trước gần nhất).
  const histCount = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.testCount ?? 0), 0),
    [sessions],
  );

  return (
    <AppShell>
      <div className="flex flex-col px-7 pb-7 pt-5">
        <div>
          <h1 className="font-display text-2xl italic text-ink-deep">Test cà phê (QC)</h1>
          <p className="mt-0.5 text-[12.5px] text-olive">
            {shiftLabel || '…'} · Profile pha hôm nay reset mỗi ngày
          </p>
        </div>

        <div className="mt-4">
          <ProfileBlock cells={profileQuery.data ?? []} />
        </div>

        {/* Phiên đang ghi */}
        <div className="mt-5 rounded-2xl border border-olive-mute/60 bg-cream p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink-deep">Phiên test</h2>
              <p className="text-[11.5px] text-olive">
                Pha thử vài lần rồi lưu cả phiên một lượt
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
                Liều
              </span>
              {['SINGLE', 'DOUBLE'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDoseType(d)}
                  className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition ${
                    doseType === d
                      ? 'border-rogue bg-rogue text-batter-lt'
                      : 'border-olive-mute text-olive hover:border-rogue'
                  }`}
                >
                  {d === 'SINGLE' ? 'Single' : 'Double'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {entries.length === 0 && (
              <p className="rounded-xl border border-dashed border-olive-mute/60 py-6 text-center text-[12.5px] text-olive">
                Chưa có lần test nào. Bấm "Thêm lần test" để bắt đầu.
              </p>
            )}
            {entries.map((e, i) => (
              <TestEntry
                key={e.key}
                index={i}
                entry={e}
                stockImports={stockImports}
                onChange={(next) => updateEntry(e.key, next)}
                onRemove={() => removeEntry(e.key)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEntries((list) => [...list, blankEntry()])}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-dashed border-olive-mute px-4 py-2 text-xs font-semibold text-olive transition hover:border-rogue hover:text-rogue"
          >
            <Plus size={14} strokeWidth={2} />
            Thêm lần test
          </button>

          {entries.length > 0 && (
            <>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú cả phiên (vd: đổi cối do độ ẩm cao hôm nay)"
                className="mt-4 h-9 w-full rounded-lg border border-olive-mute bg-batter-lt px-2.5 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue"
              />

              {error && (
                <div className="mt-3 rounded-lg border border-wine/30 bg-wine/8 px-3.5 py-2.5 text-[12.5px] text-wine">
                  {error}
                </div>
              )}

              <div className="mt-3">
                <Button onClick={submit} loading={save.isPending}>
                  Lưu phiên test
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Lịch sử */}
        <div className="mt-5 rounded-2xl border border-olive-mute/60 bg-cream p-5 shadow-card">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-ink-deep">Lịch sử test cafe</h2>
            <p className="text-[11.5px] text-olive">
              Hôm nay và ngày test gần nhất trước đó
              {histCount ? ` · ${histCount} lần test` : ''}
            </p>
          </div>
          {historyQuery.isLoading && <p className="text-[12.5px] text-olive">Đang tải…</p>}
          {!historyQuery.isLoading && sessions.length === 0 && (
            <p className="text-[12.5px] text-olive">Chưa có phiên test nào.</p>
          )}
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <HistorySession
                key={s.id}
                session={s}
                open={expanded === s.id}
                onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
