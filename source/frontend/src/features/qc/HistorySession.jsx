import { Coffee } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDayMonth } from '../../utils/fmt';
import { FAIL_LABEL } from './qcSession';

/**
 * Một phiên test trong lịch sử — thu gọn hiện ngày/ca/liều + điểm trung bình,
 * bung ra liệt kê từng lần chiết. Dùng chung cho màn desktop và mobile.
 */
export default function HistorySession({ session, open, onToggle }) {
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
                className={`h-2 w-2 shrink-0 rounded-full ${t.passed ? 'bg-[#3C6E2E]' : 'bg-wine'}`}
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
