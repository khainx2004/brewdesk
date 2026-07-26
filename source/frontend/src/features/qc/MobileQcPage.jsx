import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import Button from '../../components/ui/Button';
import { errorMessage } from '../../services/api';
import { qcApi } from '../../services/qcApi';
import { useShift } from '../../hooks/useShift';
import { formatDayMonth } from '../../utils/fmt';
import TestEntry from './TestEntry';
import HistorySession from './HistorySession';
import { blankEntry, toPayload, validate } from './qcSession';

const BEANS = [
  { key: 'ARABICA', label: 'Arabica' },
  { key: 'ROBUSTA', label: 'Robusta' },
];
const SHIFTS = [
  { key: 'SANG', label: 'Sáng' },
  { key: 'CHIEU', label: 'Chiều' },
];

const trimNum = (v) => (v == null ? '' : String(Number(v)));

/** Lưới profile pha hôm nay, bản gọn cho mobile (không cuộn ngang): ca × hạt × liều. */
function MobileProfile({ cells }) {
  const byKey = {};
  for (const c of cells) byKey[`${c.shiftPeriod}|${c.beanType}|${c.doseType}`] = c;
  const latest = cells
    .map((c) => c.sessionDate)
    .filter(Boolean)
    .sort()
    .at(-1);

  const cell = (sh, bean, dose) => {
    const c = byKey[`${sh}|${bean}|${dose}`];
    if (!c) return <span className="text-olive/40">—</span>;
    return (
      <>
        <div className="font-semibold text-ink-deep">
          {trimNum(c.doseGram)}→{trimNum(c.yieldGram)}
        </div>
        {c.extractionSeconds ? (
          <div className="text-[9px] text-olive">{c.extractionSeconds}s</div>
        ) : null}
      </>
    );
  };

  return (
    <div className="rounded-2xl border border-olive-mute/60 bg-cream p-4 shadow-card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[13.5px] font-bold text-ink-deep">Profile pha hôm nay</h2>
          <p className="text-[11px] text-olive">bột → nước · thời gian chiết</p>
        </div>
        {latest && <span className="text-[10.5px] text-olive">Cập nhật {formatDayMonth(latest)}</span>}
      </div>
      <table className="mqc-ptable">
        <thead>
          <tr>
            <th />
            {BEANS.map((b) => (
              <th key={b.key} colSpan={2} className="beanhead">
                {b.label}
              </th>
            ))}
          </tr>
          <tr>
            <th />
            {BEANS.map((b) => (
              <Fragment key={b.key}>
                <th className="dosehead sep">S</th>
                <th className="dosehead">D</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHIFTS.map((sh) => (
            <tr key={sh.key}>
              <th className="rowhead">{sh.label}</th>
              {BEANS.map((b) => (
                <Fragment key={b.key}>
                  <td className="sep">{cell(sh.key, b.key, 'SINGLE')}</td>
                  <td>{cell(sh.key, b.key, 'DOUBLE')}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Màn mobile "Test cafe (QC)" — suy ra từ màn desktop `QcPage`, giữ nguyên dữ
 * liệu + luồng (profile hôm nay, ghi cả phiên nhiều lần chiết, lịch sử 2 ngày),
 * chỉ đổi bố cục sang ngôn ngữ mobile (topbar + tab bar dưới). Dùng lại
 * `TestEntry`/`ScoreDots`/`HistorySession` và helper `qcSession` của bản desktop.
 */
export default function MobileQcPage() {
  const navigate = useNavigate();
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
  const historyQuery = useQuery({ queryKey: ['qc-history-recent'], queryFn: qcApi.recent });
  const sessions = useMemo(() => historyQuery.data ?? [], [historyQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      qcApi.create({
        shiftTypeId: shift?.id ?? undefined,
        doseType,
        note: note.trim() || null,
        tests: entries.map(toPayload),
      }),
    onSuccess: () => {
      setEntries([]);
      setNote('');
      setError(null);
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

  const histCount = useMemo(
    () => sessions.reduce((sum, s) => sum + (s.testCount ?? 0), 0),
    [sessions],
  );

  const goBack = () => navigate('/m');

  return (
    <div className="mqc">
      <header className="mqc-top">
        <button type="button" className="mqc-back" onClick={goBack} aria-label="Quay lại">
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div>
          <div className="mqc-title">Test cà phê</div>
          <div className="mqc-sub">{shiftLabel || '…'} · profile reset mỗi ngày</div>
        </div>
      </header>

      <div className="mqc-scroll">
        <MobileProfile cells={profileQuery.data ?? []} />

        {/* Phiên đang ghi */}
        <div className="mt-4 rounded-2xl border border-olive-mute/60 bg-cream p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[13.5px] font-bold text-ink-deep">Phiên test</h2>
              <p className="text-[11px] text-olive">Pha thử vài lần rồi lưu một lượt</p>
            </div>
            <div className="flex items-center gap-1.5">
              {['SINGLE', 'DOUBLE'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDoseType(d)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    doseType === d
                      ? 'border-rogue bg-rogue text-batter-lt'
                      : 'border-olive-mute text-olive'
                  }`}
                >
                  {d === 'SINGLE' ? 'Single' : 'Double'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {entries.length === 0 && (
              <p className="rounded-xl border border-dashed border-olive-mute/60 py-5 text-center text-[12px] text-olive">
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
                placeholder="Ghi chú cả phiên (vd: đổi cối do độ ẩm cao)"
                className="mt-3 h-9 w-full rounded-lg border border-olive-mute bg-batter-lt px-2.5 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue"
              />
              {error && (
                <div className="mt-3 rounded-lg border border-wine/30 bg-wine/8 px-3.5 py-2.5 text-[12.5px] text-wine">
                  {error}
                </div>
              )}
              <div className="mt-3">
                <Button onClick={submit} loading={save.isPending} className="w-full justify-center">
                  Lưu phiên test
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Lịch sử */}
        <div className="mt-4 rounded-2xl border border-olive-mute/60 bg-cream p-4 shadow-card">
          <div className="mb-3">
            <h2 className="text-[13.5px] font-bold text-ink-deep">Lịch sử test cafe</h2>
            <p className="text-[11px] text-olive">
              Hôm nay và ngày test gần nhất trước đó{histCount ? ` · ${histCount} lần test` : ''}
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

      <MobileTabBar active="qc" />
    </div>
  );
}
