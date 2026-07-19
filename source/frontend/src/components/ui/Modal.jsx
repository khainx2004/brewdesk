import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, width = 'w-[520px]' }) {
  // Đóng bằng Esc và khoá cuộn nền khi modal đang mở
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto pt-10"
      style={{ background: 'rgba(28,21,16,0.6)', backdropFilter: 'blur(4px) saturate(0.8)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`mb-10 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-olive-mute/50 bg-cream shadow-[0_24px_64px_rgba(28,21,16,0.35)] ${width}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-olive-mute/40 bg-gradient-to-b from-batter-lt to-cream px-6 py-4">
          <h2 className="font-display text-lg italic">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1 text-olive transition hover:text-wine"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-6 py-5">{children}</div>

        {footer && (
          <div className="flex gap-2.5 border-t border-olive-mute/40 bg-batter-lt px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Nhãn kiểu chữ hoa nhỏ, dùng chung cho các form trong modal. */
export function FieldLabel({ children }) {
  return (
    <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-olive">
      {children}
    </span>
  );
}

/** Công tắc bật/tắt. */
export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-10 shrink-0 rounded-full transition disabled:opacity-50 ${
        checked ? 'bg-rogue' : 'bg-olive-mute'
      }`}
    >
      <span
        className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform ${
          checked ? 'translate-x-[18px]' : ''
        }`}
      />
    </button>
  );
}
