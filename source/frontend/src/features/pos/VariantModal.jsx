import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatVnd } from '../../utils/fmt';

/**
 * Chọn mức ngọt / mức đá / số lượng trước khi thêm vào đơn.
 *
 * <p>Không dùng `components/ui/Modal` chung: modal đó có thanh tiêu đề với nút X
 * và bố cục form dọc, còn mockup POS là một thẻ gọn với hai hàng nút chọn nhanh.
 * POS ưu tiên tốc độ thao tác nên giữ đúng mockup.
 */
export default function VariantModal({ open, item, variants, onClose, onAdd }) {
  const [sweetnessId, setSweetnessId] = useState(null);
  const [iceId, setIceId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const sweetLevels = variants?.SWEETNESS_LEVEL ?? [];
  const iceLevels = variants?.ICE_LEVEL ?? [];

  // Mở modal thì đặt lại mặc định: 100% ngọt, 100% đá — mức khách gọi nhiều nhất.
  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    setSweetnessId(sweetLevels.find((v) => v.levelValue === 100)?.id ?? null);
    setIceId(iceLevels.find((v) => v.levelValue === 100)?.id ?? null);
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') submit();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }); // không khai deps: submit đọc state mới nhất mỗi lần render

  if (!open || !item) return null;

  const submit = () => {
    onAdd({
      menuItemId: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity,
      sweetnessVariantId: sweetnessId,
      iceVariantId: iceId,
      sweetnessLabel: sweetLevels.find((v) => v.id === sweetnessId)?.displayName ?? null,
      iceLabel: iceLevels.find((v) => v.id === iceId)?.displayName ?? null,
      note: null,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(28,21,16,0.6)', backdropFilter: 'blur(4px) saturate(0.8)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[350px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-olive-mute/50 bg-cream p-[26px] shadow-[0_24px_64px_rgba(28,21,16,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Highlight kính mờ phía trên, hiệu ứng 2.5D theo CLAUDE.md mục 9 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-batter-lt/60 to-transparent" />

        <h3 className="relative mb-5 font-display text-[19px] italic text-ink-deep">{item.name}</h3>

        <VariantGroup
          label="Mức ngọt"
          options={sweetLevels}
          selectedId={sweetnessId}
          onSelect={setSweetnessId}
        />
        <VariantGroup
          label="Mức đá"
          options={iceLevels}
          selectedId={iceId}
          onSelect={setIceId}
        />

        <div className="relative my-5 flex items-center justify-between text-[13.5px] font-medium text-ink-deep">
          <span>Số lượng</span>
          <div className="flex items-center gap-4">
            <StepperButton onClick={() => setQuantity((q) => Math.max(1, q - 1))} label="Bớt một">
              <Minus size={16} strokeWidth={2} />
            </StepperButton>
            <span className="min-w-5 text-center text-base font-bold tabular-nums">{quantity}</span>
            <StepperButton
              onClick={() => setQuantity((q) => Math.min(999, q + 1))}
              label="Thêm một"
            >
              <Plus size={16} strokeWidth={2} />
            </StepperButton>
          </div>
        </div>

        <div className="relative flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-olive-mute bg-batter-lt py-2.5 text-[13px] font-semibold text-olive transition hover:border-wine hover:text-wine"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex-[2] rounded-lg bg-gradient-to-br from-rogue to-rogue-dk py-2.5 text-[13px] font-bold text-batter-lt shadow-[0_4px_12px_rgba(58,61,46,0.25)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(58,61,46,0.35)]"
          >
            Thêm · {formatVnd(item.price * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}

function VariantGroup({ label, options, selectedId, onSelect }) {
  if (options.length === 0) return null;
  return (
    <div className="relative mb-[18px]">
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-olive">
        {label}
      </div>
      <div className="flex gap-[7px]">
        {options.map((option) => {
          const selected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option.id)}
              className={`flex-1 rounded-lg border py-2 text-[12.5px] transition ${
                selected
                  ? 'border-rogue bg-rogue/10 font-bold text-rogue shadow-[inset_0_0_0_1px_var(--rogue)]'
                  : 'border-olive-mute bg-batter-lt font-medium text-olive hover:border-rogue hover:text-rogue'
              }`}
            >
              {option.displayName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepperButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-[9px] border border-olive-mute bg-batter-lt text-ink-deep transition hover:border-rogue hover:bg-rogue hover:text-white"
    >
      {children}
    </button>
  );
}
