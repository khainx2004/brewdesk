import { Minus, Plus } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { formatVnd } from '../../utils/fmt';

const inputClass =
  'h-[30px] rounded-[7px] border border-olive-mute bg-cream px-2 text-right text-xs text-ink-deep outline-none transition focus:border-rogue';

export default function CartPanel({
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  totals,
  onCheckout,
  submitting,
  error,
  notice,
}) {
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const { subtotal, discountAmount, total, change, notEnoughCash } = totals;
  const isCash = paymentMethod === 'CASH';
  const canCheckout = lines.length > 0 && !submitting && !(isCash && notEnoughCash);

  return (
    <aside className="flex w-[368px] shrink-0 flex-col overflow-hidden rounded-xl border border-olive-mute bg-cream shadow-[0_2px_10px_rgba(28,21,16,0.06),0_16px_40px_rgba(28,21,16,0.07)]">
      <div className="flex items-center justify-between border-b border-olive-mute/50 bg-gradient-to-b from-batter-lt to-cream px-5 py-4">
        <span className="font-display text-[17px] italic text-ink-deep">Đơn hiện tại</span>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-semibold text-wine opacity-75 transition hover:opacity-100"
          >
            Xoá đơn
          </button>
        )}
      </div>

      <div className="min-h-20 flex-1 overflow-y-auto px-4 py-1">
        {lines.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] italic text-olive opacity-65">
            Chưa có món nào trong đơn
          </p>
        ) : (
          lines.map((line) => (
            <div key={line.key} className="border-b border-olive-mute/35 py-2.5 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink-deep">
                    {line.name}
                  </div>
                  {(line.sweetnessLabel || line.iceLabel) && (
                    <div className="mt-0.5 text-[11px] text-olive">
                      {[line.sweetnessLabel, line.iceLabel].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="whitespace-nowrap text-[13px] font-bold text-caramel">
                  {formatVnd(line.unitPrice * line.quantity)}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <QtyButton
                    onClick={() => setQuantity(line.key, line.quantity - 1)}
                    label={`Bớt ${line.name}`}
                  >
                    <Minus size={12} strokeWidth={2.5} />
                  </QtyButton>
                  <span className="min-w-4 text-center text-[13px] font-bold tabular-nums text-ink-deep">
                    {line.quantity}
                  </span>
                  <QtyButton
                    onClick={() => setQuantity(line.key, Math.min(999, line.quantity + 1))}
                    label={`Thêm ${line.name}`}
                  >
                    <Plus size={12} strokeWidth={2.5} />
                  </QtyButton>
                </div>
                <button
                  type="button"
                  onClick={() => remove(line.key)}
                  className="text-[11.5px] text-olive transition hover:text-wine"
                >
                  Xoá
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-olive-mute/50 bg-gradient-to-b from-batter-lt to-batter-warm px-5 pb-[18px] pt-3.5">
        <Row label="Tạm tính" value={formatVnd(subtotal)} />

        <div className="flex items-center justify-between py-1.5 text-xs text-olive">
          <span>Giảm giá</span>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="0"
              placeholder="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className={`${inputClass} w-[72px]`}
              aria-label="Số tiền hoặc phần trăm giảm giá"
            />
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className={`${inputClass} cursor-pointer px-1.5 text-left`}
              aria-label="Kiểu giảm giá"
            >
              <option value="FIXED">đ</option>
              <option value="PERCENT">%</option>
            </select>
          </div>
        </div>

        {discountAmount > 0 && (
          <Row label="Đã giảm" value={`− ${formatVnd(discountAmount)}`} />
        )}

        <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-olive/40 pb-0.5 pt-2.5 text-[15.5px] font-bold text-ink-deep">
          <span>Tổng cộng</span>
          <span className="font-display text-lg italic text-rogue">{formatVnd(total)}</span>
        </div>

        <div className="my-2.5 flex gap-2">
          <PayButton
            active={isCash}
            onClick={() => setPaymentMethod('CASH')}
            label="Tiền mặt"
          />
          <PayButton
            active={!isCash}
            onClick={() => setPaymentMethod('TRANSFER')}
            label="Chuyển khoản"
          />
        </div>

        {/* Ô tiền khách đưa chỉ có nghĩa khi trả tiền mặt — CLAUDE.md mục 9. */}
        {isCash && (
          <div className="my-0.5 rounded-lg border border-olive/20 bg-olive/[0.08] px-3 py-2">
            <div className="flex items-center justify-between py-1 text-xs text-olive">
              <span>Tiền khách đưa</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className={`${inputClass} w-[126px] ${notEnoughCash && cashReceived !== '' ? 'border-wine' : ''}`}
                aria-label="Tiền khách đưa"
              />
            </div>
            <div
              className={`flex items-center justify-between py-1 text-xs font-bold ${
                notEnoughCash && cashReceived !== '' ? 'text-wine' : 'text-ink-deep'
              }`}
            >
              <span>Tiền thối lại</span>
              <span className="tabular-nums">
                {notEnoughCash && cashReceived !== ''
                  ? `Còn thiếu ${formatVnd(-change)}`
                  : formatVnd(Math.max(change, 0))}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onCheckout}
          disabled={!canCheckout}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-rogue to-rogue-dk py-3 text-sm font-bold tracking-wide text-batter-lt shadow-[0_4px_14px_rgba(58,61,46,0.3)] transition hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(58,61,46,0.4)] disabled:cursor-not-allowed disabled:bg-olive-mute disabled:bg-none disabled:text-cream disabled:shadow-none disabled:hover:translate-y-0"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {submitting ? 'Đang ghi đơn...' : 'Thanh toán'}
        </button>

        {/* Lỗi nghiệp vụ (hết nguyên liệu, món chưa có công thức...) phải đọc
            được ngay giữa lúc có khách đứng đợi, không giấu trong toast. */}
        {error && (
          <p className="mt-2 rounded-lg border border-wine/30 bg-wine/10 px-3 py-2 text-center text-[12px] font-medium leading-relaxed text-wine">
            {error}
          </p>
        )}
        {!error && notice && (
          <p className="mt-2 text-center text-xs font-semibold text-rogue">{notice}</p>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs text-olive">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function QtyButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-[22px] w-[22px] place-items-center rounded-md border border-olive-mute bg-batter-lt text-ink-deep transition hover:border-rogue hover:bg-rogue hover:text-white"
    >
      {children}
    </button>
  );
}

function PayButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex-1 rounded-lg border py-2 text-[12.5px] font-semibold transition ${
        active
          ? 'border-rogue bg-rogue/[0.08] text-rogue shadow-[inset_0_0_0_1px_var(--rogue)]'
          : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
      }`}
    >
      {label}
    </button>
  );
}
