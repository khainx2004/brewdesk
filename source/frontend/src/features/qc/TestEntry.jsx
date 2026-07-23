import { Trash2 } from 'lucide-react';
import ScoreDots from './ScoreDots';

/** Ô nhập số có đơn vị ở góc phải, theo mockup. */
function UnitInput({ label, unit, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-olive-mute bg-batter-lt pl-2.5 pr-8 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-olive">
          {unit}
        </span>
      </div>
    </label>
  );
}

const FAIL_ACTIONS = [
  { value: 'NOTIFY_MANAGER', label: 'Báo quản lý ngay' },
  { value: 'STOP_BATCH', label: 'Ngừng dùng lô này' },
  { value: 'RETEST', label: 'Pha lại và test lần 2' },
];

/**
 * Một lần chiết trong phiên test. Người pha bấm "Thêm lần test" tạo entry rồi
 * điền — vài lần chiết dồn lại thành một phiên, gửi trong một request
 * (QcSessionRequest), chứ không ghi từng shot rồi chờ.
 */
export default function TestEntry({ index, entry, stockImports, onChange, onRemove }) {
  const set = (patch) => onChange({ ...entry, ...patch });

  // Tỉ lệ chiết = nước ra / bột vào — chỉ số cốt lõi của espresso, tính ngay để
  // người pha thấy khi đang dial-in.
  const dose = Number(entry.doseGram);
  const yield_ = Number(entry.yieldGram);
  const ratio = dose > 0 && yield_ > 0 ? (yield_ / dose).toFixed(2) : null;

  return (
    <div className="rounded-xl border border-olive-mute/50 bg-batter-lt p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-5.5 w-5.5 min-h-[22px] min-w-[22px] place-items-center rounded-full bg-rogue text-[11px] font-bold text-batter-lt">
          {index + 1}
        </span>
        <select
          value={entry.stockImportId}
          onChange={(e) => set({ stockImportId: e.target.value })}
          className="h-8 flex-1 rounded-lg border border-olive-mute bg-cream px-2 text-[12px] text-ink-deep outline-none focus:border-rogue"
        >
          <option value="">— Lô cà phê (không bắt buộc) —</option>
          {stockImports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.batchCode ? `${s.batchCode} · ` : ''}
              {s.ingredientName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          title="Xoá lần test này"
          aria-label="Xoá lần test này"
          className="rounded-md p-1.5 text-olive-mute transition hover:bg-wine/10 hover:text-wine"
        >
          <Trash2 size={15} strokeWidth={1.5} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        <UnitInput
          label="Bột vào"
          unit="g"
          value={entry.doseGram}
          onChange={(v) => set({ doseGram: v })}
          placeholder="18"
        />
        <UnitInput
          label="Nước ra"
          unit="g"
          value={entry.yieldGram}
          onChange={(v) => set({ yieldGram: v })}
          placeholder="36"
        />
        <div className="flex flex-col justify-end">
          <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
            Tỉ lệ
          </span>
          <div className="flex h-9 items-center rounded-lg border border-dashed border-olive-mute bg-batter-warm/50 px-2.5 text-[12.5px] font-semibold text-olive">
            {ratio ? `1 : ${ratio}` : '—'}
          </div>
        </div>
        <UnitInput
          label="Thời gian"
          unit="s"
          value={entry.extractionSeconds}
          onChange={(v) => set({ extractionSeconds: v })}
          placeholder="28"
        />
        <UnitInput
          label="Nhiệt độ nồi hơi"
          unit="°C"
          value={entry.boilerTempC}
          onChange={(v) => set({ boilerTempC: v })}
          placeholder="120"
        />
        <UnitInput
          label="Độ ẩm"
          unit="%"
          value={entry.humidityPercent}
          onChange={(v) => set({ humidityPercent: v })}
          placeholder="62"
        />
      </div>

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
          Mức xay
        </span>
        <input
          value={entry.grindSetting}
          onChange={(e) => set({ grindSetting: e.target.value })}
          placeholder="vd: 4.5 hoặc mức cối"
          maxLength={50}
          className="h-9 w-full rounded-lg border border-olive-mute bg-batter-lt px-2.5 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-7 rounded-[9px] border border-[rgba(157,145,103,0.35)] bg-batter-warm px-3 py-2.5">
        <ScoreDots
          label="Acidity"
          value={entry.acidity}
          onChange={(v) => set({ acidity: v })}
        />
        <ScoreDots label="Body" value={entry.body} onChange={(v) => set({ body: v })} />
        <ScoreDots
          label="Sweetness"
          value={entry.sweetness}
          onChange={(v) => set({ sweetness: v })}
        />
      </div>

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
          Vị & hậu vị
        </span>
        <input
          value={entry.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="vd: chua thanh, hậu ngọt vừa"
          className="h-9 w-full rounded-lg border border-olive-mute bg-batter-lt px-2.5 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue"
        />
      </label>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
          Kết quả
        </span>
        <button
          type="button"
          onClick={() => set({ passed: true, failAction: '' })}
          className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition ${
            entry.passed === true
              ? 'border-[#3C6E2E] bg-[#3C6E2E]/12 text-[#3C6E2E]'
              : 'border-olive-mute text-olive hover:border-[#3C6E2E]'
          }`}
        >
          Đạt
        </button>
        <button
          type="button"
          onClick={() => set({ passed: false })}
          className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition ${
            entry.passed === false
              ? 'border-wine bg-wine/12 text-wine'
              : 'border-olive-mute text-olive hover:border-wine'
          }`}
        >
          Không đạt
        </button>
      </div>

      {/* Không đạt thì bắt buộc chọn hành động — backend chặn phiên thiếu, và ghi
          "không đạt" rồi bỏ trống xử lý chính là thứ biến bảng QC thành hình thức. */}
      {entry.passed === false && (
        <label className="mt-2.5 block">
          <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-wine">
            Hành động xử lý (bắt buộc)
          </span>
          <select
            value={entry.failAction}
            onChange={(e) => set({ failAction: e.target.value })}
            className={`h-9 w-full rounded-lg border bg-cream px-2.5 text-[12.5px] text-ink-deep outline-none transition focus:border-rogue ${
              entry.failAction ? 'border-olive-mute' : 'border-wine'
            }`}
          >
            <option value="">— Chọn hành động —</option>
            {FAIL_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
