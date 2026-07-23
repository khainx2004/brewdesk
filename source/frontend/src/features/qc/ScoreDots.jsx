/**
 * Thang điểm 1–5 dạng chấm tròn, theo mockup Test cafe.
 *
 * Bắt buộc chọn (backend từ chối phiên thiếu điểm cảm quan), nên chưa chọn thì
 * viền olive rỗng; chọn tới đâu tô rogue tới đó.
 */
export default function ScoreDots({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
        {label}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
            aria-pressed={value === n}
            className={`grid h-5 w-5 place-items-center rounded-full border-[1.5px] text-[10px] font-semibold transition ${
              value >= n
                ? 'border-rogue bg-rogue text-batter-lt'
                : 'border-olive-mute bg-cream text-olive-mute hover:border-rogue'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
