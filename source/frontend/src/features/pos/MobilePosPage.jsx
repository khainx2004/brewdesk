import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Coffee,
  Cookie,
  CupSoda,
  FileText,
  Minus,
  Plus,
  Search,
  Snowflake,
  X,
} from 'lucide-react';
import { categoryApi, menuItemApi, variantApi } from '../../services/menuApi';
import { orderApi } from '../../services/posApi';
import { errorMessage } from '../../services/api';
import { useCartStore } from '../../stores/cartStore';
import { useShift } from '../../hooks/useShift';
import { formatVnd } from '../../utils/fmt';
import MobileTabBar from '../../components/layout/MobileTabBar';
import VariantModal from './VariantModal';
import OrdersPanel from './OrdersPanel';

/** Icon theo tên danh mục — line-art Lucide, không emoji (CLAUDE.md mục 9). */
function iconFor(categoryName = '') {
  const name = categoryName.toLowerCase();
  if (name.includes('trà')) return CupSoda;
  if (name.includes('đá xay') || name.includes('da xay')) return Snowflake;
  if (name.includes('bánh') || name.includes('banh')) return Cookie;
  return Coffee;
}

/**
 * Màn POS mobile — suy ra từ màn desktop `PosPage`, giữ nguyên dữ liệu + luồng
 * (menu, biến thể, giỏ hàng, giảm giá, tiền khách đưa, thanh toán, huỷ đơn).
 * Khác bố cục: lưới món đầy màn, giỏ hàng là **cart bar** dính trên tab bar, bấm
 * mở **sheet thanh toán** trượt từ dưới. Dùng lại `VariantModal`/`OrdersPanel`
 * (đều đã co giãn được) và `cartStore` chung.
 */
export default function MobilePosPage() {
  const { shift, label: shiftLabel } = useShift();

  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [pendingItem, setPendingItem] = useState(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [discountType, setDiscountType] = useState('FIXED');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.add);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.remove);
  const clearCart = useCartStore((s) => s.clear);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'pos'],
    queryFn: () => categoryApi.list({ size: 100 }),
  });
  const menuQuery = useQuery({
    queryKey: ['menu-items', 'pos'],
    queryFn: () => menuItemApi.list({ size: 200, includeInactive: true }),
  });
  const variantsQuery = useQuery({
    queryKey: ['variants-grouped'],
    queryFn: variantApi.grouped,
    staleTime: Infinity,
  });

  const categories = categoriesQuery.data?.items ?? [];
  const allItems = useMemo(() => menuQuery.data?.items ?? [], [menuQuery.data]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeCategory && item.categoryId !== activeCategory) return false;
      if (keyword && !item.name.toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [allItems, activeCategory, search]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const raw = Number(discountValue) || 0;
    const rawAmount = discountType === 'PERCENT' ? Math.round((subtotal * raw) / 100) : raw;
    const discountAmount = Math.min(Math.max(rawAmount, 0), subtotal);
    const total = subtotal - discountAmount;
    const received = Number(cashReceived) || 0;
    return {
      subtotal,
      discountAmount,
      total,
      change: received - total,
      notEnoughCash: received < total,
    };
  }, [lines, discountType, discountValue, cashReceived]);

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const resetOrderForm = () => {
    clearCart();
    setDiscountValue('');
    setCashReceived('');
  };

  const checkout = useMutation({
    mutationFn: () => {
      const value = Number(discountValue) || 0;
      return orderApi.create({
        lines: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          sweetnessVariantId: l.sweetnessVariantId,
          iceVariantId: l.iceVariantId,
          note: l.note,
        })),
        paymentMethod,
        discountType: value > 0 ? discountType : null,
        discountValue: value > 0 ? value : null,
      });
    },
    onMutate: () => {
      setError(null);
      setNotice(null);
    },
    onSuccess: (order) => {
      const change = totals.change;
      setNotice(
        paymentMethod === 'CASH' && change > 0
          ? `Đã ghi đơn ${order.orderCode} · thối lại ${formatVnd(change)}`
          : `Đã ghi đơn ${order.orderCode}`,
      );
      resetOrderForm();
      setSheetOpen(false);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const loading = menuQuery.isLoading || categoriesQuery.isLoading;
  const isCash = paymentMethod === 'CASH';
  const canCheckout = lines.length > 0 && !checkout.isPending && !(isCash && totals.notEnoughCash);

  const chipCls = (active) =>
    `flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
      active ? 'border-rogue bg-rogue text-batter-lt' : 'border-olive-mute text-olive'
    }`;
  const inputCls =
    'h-[30px] rounded-[7px] border border-olive-mute bg-cream px-2 text-right text-[13px] text-ink-deep outline-none focus:border-rogue';

  return (
    <div className="mpos">
      <header className="mpos-top">
        <div className="mpos-toprow">
          <div>
            <div className="mpos-title">POS bán hàng</div>
            <div className="mpos-sub">{shift ? `${shift.name} · ${shift.code}` : shiftLabel || '…'}</div>
          </div>
          <button type="button" className="mpos-orders" onClick={() => setOrdersOpen(true)}>
            <FileText size={14} strokeWidth={1.8} />
            Đơn hôm nay
          </button>
        </div>

        <div className="mpos-search">
          <Search size={16} strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên món..."
          />
        </div>

        <div className="mpos-chips">
          <button className={chipCls(activeCategory === null)} onClick={() => setActiveCategory(null)}>
            Tất cả
          </button>
          {categories.map((c) => (
            <button key={c.id} className={chipCls(activeCategory === c.id)} onClick={() => setActiveCategory(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {notice && (
        <div className="mpos-notice" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      <div className="mpos-grid">
        {loading && <p className="col-span-2 py-10 text-center text-sm text-olive">Đang tải menu...</p>}
        {!loading && visibleItems.length === 0 && (
          <p className="col-span-2 py-10 text-center text-sm italic text-olive opacity-70">
            Không tìm thấy món nào
          </p>
        )}
        {visibleItems.map((item) => {
          const Icon = iconFor(item.categoryName);
          const noRecipe = (item.recipeCount ?? 0) === 0;
          const unavailable = !item.active || noRecipe;
          return (
            <button
              key={item.id}
              type="button"
              disabled={unavailable}
              onClick={() => setPendingItem(item)}
              className={`flex min-h-[104px] flex-col gap-1.5 rounded-lg border p-3 text-left transition ${
                unavailable
                  ? 'cursor-not-allowed border-olive-mute/60 bg-cream opacity-[0.45]'
                  : 'border-olive-mute/60 bg-cream shadow-[0_1px_3px_rgba(28,21,16,0.05)] active:scale-[0.98]'
              }`}
            >
              <span className="grid h-10 w-full place-items-center rounded-lg bg-gradient-to-br from-batter to-batter-warm">
                <Icon size={20} strokeWidth={1.5} className="text-rogue" />
              </span>
              <span className="text-[12.5px] font-semibold leading-snug text-ink-deep">{item.name}</span>
              {unavailable ? (
                <span className="mt-auto text-[9.5px] font-bold uppercase tracking-[0.05em] text-wine">
                  {!item.active ? 'Tạm hết hàng' : 'Chưa có công thức'}
                </span>
              ) : (
                <span className="mt-auto text-[12.5px] font-semibold text-caramel">
                  {formatVnd(item.price)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {lines.length > 0 && (
        <button type="button" className="mpos-cartbar" onClick={() => setSheetOpen(true)}>
          <span className="mpos-cartbar-count">{itemCount}</span>
          <span className="mpos-cartbar-total">{formatVnd(totals.total)}</span>
          <span className="mpos-cartbar-cta">Thanh toán</span>
        </button>
      )}

      <MobileTabBar active="pos" />

      {/* Sheet thanh toán */}
      {sheetOpen && (
        <div className="mpos-sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="mpos-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mpos-sheet-head">
              <span className="font-display text-[17px] italic text-ink-deep">Đơn hiện tại</span>
              <div className="flex items-center gap-3">
                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={resetOrderForm}
                    className="text-xs font-semibold text-wine opacity-75"
                  >
                    Xoá đơn
                  </button>
                )}
                <button type="button" onClick={() => setSheetOpen(false)} aria-label="Đóng" className="text-olive">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="mpos-sheet-list">
              {lines.length === 0 ? (
                <p className="px-5 py-10 text-center text-[13px] italic text-olive opacity-65">
                  Chưa có món nào trong đơn
                </p>
              ) : (
                lines.map((line) => (
                  <div key={line.key} className="border-b border-olive-mute/35 py-2.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-ink-deep">{line.name}</div>
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
                      <div className="flex items-center gap-3">
                        <StepBtn onClick={() => setQuantity(line.key, line.quantity - 1)} label={`Bớt ${line.name}`}>
                          <Minus size={14} strokeWidth={2.5} />
                        </StepBtn>
                        <span className="min-w-5 text-center text-[14px] font-bold tabular-nums text-ink-deep">
                          {line.quantity}
                        </span>
                        <StepBtn
                          onClick={() => setQuantity(line.key, Math.min(999, line.quantity + 1))}
                          label={`Thêm ${line.name}`}
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </StepBtn>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-[11.5px] text-olive transition hover:text-wine"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mpos-sheet-foot">
              <Row label="Tạm tính" value={formatVnd(totals.subtotal)} />
              <div className="flex items-center justify-between py-1.5 text-xs text-olive">
                <span>Giảm giá</span>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className={`${inputCls} w-[76px]`}
                    aria-label="Số tiền hoặc phần trăm giảm giá"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className={`${inputCls} px-1.5 text-left`}
                    aria-label="Kiểu giảm giá"
                  >
                    <option value="FIXED">đ</option>
                    <option value="PERCENT">%</option>
                  </select>
                </div>
              </div>
              {totals.discountAmount > 0 && (
                <Row label="Đã giảm" value={`− ${formatVnd(totals.discountAmount)}`} />
              )}
              <div className="mt-1.5 flex items-center justify-between border-t border-dashed border-olive/40 pb-0.5 pt-2.5 text-[15.5px] font-bold text-ink-deep">
                <span>Tổng cộng</span>
                <span className="font-display text-lg italic text-rogue">{formatVnd(totals.total)}</span>
              </div>

              <div className="my-2.5 flex gap-2">
                <PayBtn active={isCash} onClick={() => setPaymentMethod('CASH')} label="Tiền mặt" />
                <PayBtn active={!isCash} onClick={() => setPaymentMethod('TRANSFER')} label="Chuyển khoản" />
              </div>

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
                      className={`${inputCls} w-[130px] ${
                        totals.notEnoughCash && cashReceived !== '' ? 'border-wine' : ''
                      }`}
                      aria-label="Tiền khách đưa"
                    />
                  </div>
                  <div
                    className={`flex items-center justify-between py-1 text-xs font-bold ${
                      totals.notEnoughCash && cashReceived !== '' ? 'text-wine' : 'text-ink-deep'
                    }`}
                  >
                    <span>Tiền thối lại</span>
                    <span className="tabular-nums">
                      {totals.notEnoughCash && cashReceived !== ''
                        ? `Còn thiếu ${formatVnd(-totals.change)}`
                        : formatVnd(Math.max(totals.change, 0))}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => checkout.mutate()}
                disabled={!canCheckout}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-rogue to-rogue-dk py-3 text-sm font-bold tracking-wide text-batter-lt shadow-[0_4px_14px_rgba(58,61,46,0.3)] transition disabled:cursor-not-allowed disabled:bg-olive-mute disabled:bg-none disabled:text-cream disabled:shadow-none"
              >
                {checkout.isPending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {checkout.isPending ? 'Đang ghi đơn...' : 'Thanh toán'}
              </button>

              {error && (
                <p className="mt-2 rounded-lg border border-wine/30 bg-wine/10 px-3 py-2 text-center text-[12px] font-medium leading-relaxed text-wine">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <VariantModal
        open={Boolean(pendingItem)}
        item={pendingItem}
        variants={variantsQuery.data}
        onClose={() => setPendingItem(null)}
        onAdd={(line) => {
          addLine(line);
          setError(null);
          setNotice(null);
        }}
      />
      <OrdersPanel open={ordersOpen} onClose={() => setOrdersOpen(false)} />
    </div>
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

function StepBtn({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-md border border-olive-mute bg-batter-lt text-ink-deep transition active:bg-rogue active:text-white"
    >
      {children}
    </button>
  );
}

function PayBtn({ active, onClick, label }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex-1 rounded-lg border py-2 text-[12.5px] font-semibold transition ${
        active
          ? 'border-rogue bg-rogue/[0.08] text-rogue shadow-[inset_0_0_0_1px_var(--rogue)]'
          : 'border-olive-mute text-olive'
      }`}
    >
      {label}
    </button>
  );
}
