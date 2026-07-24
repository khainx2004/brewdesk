import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coffee, Plus } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { errorMessage } from '../../services/api';
import { qcApi } from '../../services/qcApi';
import { useShift } from '../../hooks/useShift';
import { formatDayMonth } from '../../utils/fmt';
import TestEntry from './TestEntry';
import ProfileBlock from './ProfileBlock';

const FAIL_LABEL = {
  NOTIFY_MANAGER: 'Báo quản lý',
  STOP_BATCH: 'Ngừng dùng lô',
  RETEST: 'Pha lại',
};

function blankEntry() {
  return {
    key: crypto.randomUUID(),
    stockImportId: '',
    doseGram: '',
    yieldGram: '',
    extractionSeconds: '',
    grindSetting: '',
    boilerTempC: '',
    humidityPercent: '',
    acidity: 0,
    body: 0,
    sweetness: 0,
    note: '',
    passed: null,
    failAction: '',
  };
}

/** Chuyển ô rỗng thành null, số thành Number — đúng dạng backend nhận. */
function toPayload(e) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  return {
    stockImportId: e.stockImportId || null,
    doseGram: num(e.doseGram),
    yieldGram: num(e.yieldGram),
    extractionSeconds: num(e.extractionSeconds),
    grindSetting: e.grindSetting.trim() || null,
    boilerTempC: num(e.boilerTempC),
    humidityPercent: num(e.humidityPercent),
    acidity: e.acidity || null,
    body: e.body || null,
    sweetness: e.sweetness || null,
    passed: e.passed,
    failAction: e.passed === false ? e.failAction || null : null,
    note: e.note.trim() || null,
  };
}

/** Lý do không cho lưu, hoặc null nếu hợp lệ. Chặn ở client cho khớp backend. */
function validate(entries) {
  if (entries.length === 0) return 'Chưa có lần test nào';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const n = i + 1;
    if (!e.acidity || !e.body || !e.sweetness)
      return `Lần ${n}: chưa chấm đủ điểm chua / đậm / ngọt`;
    if (e.passed === null) return `Lần ${n}: chưa chọn đạt hay không đạt`;
    if (e.passed === false && !e.failAction)
      return `Lần ${n}: không đạt thì phải chọn hành động xử lý`;
  }
  return null;
}

export default function QcPage() {
  const queryClient = useQueryClient();
  const { shift, label: shiftLabel } = useShift();

  const [doseType, setDoseType] = useState('DOUBLE');
  const [entries, setEntries] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const stockQuery = useQuery({ queryKey: ['stock-imports'], queryFn: qcApi.stockImports });
  const stockImports = stockQuery.data?.items ?? [];

  const profileQuery = useQuery({ queryKey: ['qc-profile'], queryFn: qcApi.profile });

  // Lịch sử chỉ soi ngày gần nhất trước hôm nay — test hôm nay nằm ở Profile
  // hôm nay và phiên đang ghi, không trộn vào lịch sử.
  const historyQuery = useQuery({
    queryKey: ['qc-history-prev'],
    queryFn: qcApi.previousDay,
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
      // Test mới là của hôm nay: cập nhật Profile hôm nay; lịch sử (ngày trước)
      // không đổi nên không cần nạp lại.
      queryClient.invalidateQueries({ queryKey: ['qc-profile'] });
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

  // Số lần test của ngày lịch sử (ngày gần nhất trước hôm nay).
  const histCount = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.testCount ?? 0), 0),
    [sessions],
  );
  const histDate = sessions[0]?.sessionDate;

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
            <h2 className="text-sm font-bold text-ink-deep">
              Lịch sử test cafe
              {histDate ? ` — ngày ${formatDayMonth(histDate)}` : ''}
            </h2>
            <p className="text-[11.5px] text-olive">
              Ngày gần nhất trước hôm nay{histCount ? ` · ${histCount} lần test` : ''}
            </p>
          </div>
          {historyQuery.isLoading && <p className="text-[12.5px] text-olive">Đang tải…</p>}
          {!historyQuery.isLoading && sessions.length === 0 && (
            <p className="text-[12.5px] text-olive">
              Không có phiên test nào ở ngày trước.
            </p>
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

function HistorySession({ session, open, onToggle }) {
  const failCount = session.tests?.filter((t) => !t.passed).length ?? 0;
  const allPass = failCount === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-olive-mute/50 bg-batter-lt">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
      >
        <Coffee size={15} strokeWidth={1.5} className="shrink-0 text-olive" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="font-semibold text-ink-deep">
              {formatDayMonth(session.sessionDate)}
            </span>
            <span className="text-olive">
              {session.shiftTypeName} · {session.doseType === 'SINGLE' ? 'Single' : 'Double'}
              {session.performedByName ? ` · ${session.performedByName}` : ''}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-olive">
            {session.testCount} lần · chua {session.avgAcidity} · đậm {session.avgBody} · ngọt{' '}
            {session.avgSweetness}
          </div>
        </div>
        <Badge tone={allPass ? 'active' : 'warn'}>
          {allPass ? 'Đạt' : `${failCount} không đạt`}
        </Badge>
      </button>

      {open && (
        <div className="border-t border-olive-mute/40 px-3.5 py-2.5">
          {session.tests?.map((t, i) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-olive-mute/30 py-1.5 text-[11.5px] last:border-b-0"
            >
              <span className="font-semibold text-ink-deep">#{i + 1}</span>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  t.passed ? 'bg-[#3C6E2E]' : 'bg-wine'
                }`}
              />
              <span className="text-olive">
                {t.ratio ? `1:${t.ratio}` : '—'}
                {t.extractionSeconds ? ` · ${t.extractionSeconds}s` : ''}
                {t.boilerTempC ? ` · ${t.boilerTempC}°C` : ''}
              </span>
              <span className="text-olive">
                chua {t.acidity} · đậm {t.body} · ngọt {t.sweetness}
              </span>
              {t.batchCode && <span className="text-olive">lô {t.batchCode}</span>}
              {t.note && <span className="text-ink-deep">{t.note}</span>}
              {!t.passed && t.failAction && (
                <span className="font-semibold text-wine">
                  → {FAIL_LABEL[t.failAction] ?? t.failAction}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
