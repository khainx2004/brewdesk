import { formatDayMonth } from '../../utils/fmt';

/** Bỏ số 0 thừa: 11.500 -> "11.5", 23.000 -> "23". */
function trimNum(v) {
  if (v == null) return '';
  return String(Number(v));
}

/**
 * Một ô của lưới profile. Rỗng (chưa có lần đạt) thì để gạch mờ; có thì hiện
 * thông số lần test đạt gần nhất, đúng như "11.5 → 23 (34s)" người pha đọc.
 */
function Cell({ cell }) {
  if (!cell) {
    return <div className="py-2 text-center text-[11px] text-olive/40">—</div>;
  }
  return (
    <div className="px-1.5 py-1.5 text-center" title={`${cell.performedByName ?? ''} · ${cell.sessionDate ?? ''}`}>
      <div className="text-[12px] font-semibold text-ink-deep">
        {trimNum(cell.doseGram)} → {trimNum(cell.yieldGram)}
        {cell.extractionSeconds ? (
          <span className="font-normal text-olive"> ({cell.extractionSeconds}s)</span>
        ) : null}
      </div>
      <div className="mt-0.5 text-[10px] text-olive">
        {cell.grindSetting ? `cối ${cell.grindSetting}` : ''}
        {cell.boilerTempC ? `${cell.grindSetting ? ' · ' : ''}${trimNum(cell.boilerTempC)}°C` : ''}
      </div>
    </div>
  );
}

const BEANS = [
  { key: 'ARABICA', label: 'Arabica' },
  { key: 'ROBUSTA', label: 'Robusta' },
];
const DOSES = [
  { key: 'SINGLE', label: 'S' },
  { key: 'DOUBLE', label: 'D' },
];
const SHIFTS = [
  { key: 'SANG', label: 'Sáng' },
  { key: 'CHIEU', label: 'Chiều' },
];

/**
 * "Profile pha hôm nay" — lưới cài pha đã chốt, đúng bố cục mockup:
 * ca (Sáng/Chiều) × loại hạt (Arabica/Robusta) × liều (Single/Double).
 *
 * Không nhập tay: mỗi ô là thông số lần test ĐÃ ĐẠT gần nhất cho tổ hợp đó, do
 * backend suy từ các lần test đạt (loại hạt lấy từ lô cà phê).
 */
export default function ProfileBlock({ cells }) {
  const byKey = {};
  for (const c of cells) {
    byKey[`${c.shiftPeriod}|${c.beanType}|${c.doseType}`] = c;
  }

  const latest = cells
    .map((c) => c.sessionDate)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div className="rounded-2xl border border-olive-mute/60 bg-cream p-5 shadow-card">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-ink-deep">Profile pha hôm nay</h2>
          <p className="text-[11.5px] text-olive">
            Thông số lần test đạt gần nhất — bột → nước (giây), cối, nhiệt độ
          </p>
        </div>
        {latest && (
          <span className="text-[11px] text-olive">Cập nhật {formatDayMonth(latest)}</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr>
              <th className="w-14 border-b border-olive-mute/50 pb-1.5" />
              {BEANS.map((b) => (
                <th
                  key={b.key}
                  colSpan={2}
                  className="border-b border-l border-olive-mute/50 pb-1.5 text-center text-[11px] font-bold uppercase tracking-[0.05em] text-olive"
                >
                  {b.label}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border-b border-olive-mute/40" />
              {BEANS.map((b) =>
                DOSES.map((d) => (
                  <th
                    key={`${b.key}-${d.key}`}
                    className={`border-b border-olive-mute/40 pb-1 text-center text-[10px] font-bold text-olive ${
                      d.key === 'SINGLE' ? 'border-l border-olive-mute/50' : ''
                    }`}
                  >
                    {d.label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {SHIFTS.map((sh) => (
              <tr key={sh.key}>
                <td className="border-b border-olive-mute/30 py-1.5 text-[12px] font-semibold text-ink-deep">
                  {sh.label}
                </td>
                {BEANS.map((b) =>
                  DOSES.map((d) => (
                    <td
                      key={`${b.key}-${d.key}`}
                      className={`border-b border-olive-mute/30 align-middle ${
                        d.key === 'SINGLE' ? 'border-l border-olive-mute/40' : ''
                      }`}
                    >
                      <Cell cell={byKey[`${sh.key}|${b.key}|${d.key}`]} />
                    </td>
                  )),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
