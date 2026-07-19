import { AlertCircle, BookOpen, Coffee, CupSoda, Pencil, Power, Snowflake, Sparkles } from 'lucide-react';
import { formatVnd } from '../../utils/fmt';

/** Chọn hình minh hoạ theo tên danh mục, không có gì khớp thì dùng tách cà phê. */
function categoryIcon(categoryName = '') {
  const name = categoryName.toLowerCase();
  if (name.includes('trà') || name.includes('tra')) return CupSoda;
  if (name.includes('đá xay') || name.includes('da xay') || name.includes('xay')) return Snowflake;
  return Coffee;
}

export default function MenuCard({ item, canEdit, onEdit, onToggle, toggling }) {
  const Icon = categoryIcon(item.categoryName);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-olive-mute/60 bg-cream shadow-[0_1px_3px_rgba(28,21,16,0.05),0_4px_10px_rgba(28,21,16,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-rogue hover:shadow-[0_2px_8px_rgba(28,21,16,0.07),0_12px_24px_rgba(58,61,46,0.1)] ${
        item.active ? '' : 'opacity-[0.52]'
      }`}
    >
      <div className="relative flex h-20 items-center justify-center bg-gradient-to-br from-batter to-batter-warm">
        <Icon size={28} strokeWidth={1.5} className="text-rogue opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />

        <span className="absolute left-2 top-2 rounded-full bg-cocoa/55 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.05em] text-batter-lt">
          {item.categoryName}
        </span>
        <span
          className={`absolute right-2 top-2 rounded-full border px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${
            item.active
              ? 'border-rogue/25 bg-rogue/15 text-rogue'
              : 'border-wine/20 bg-wine/12 text-wine'
          }`}
        >
          {item.active ? 'Đang bán' : 'Tạm ẩn'}
        </span>
      </div>

      <div className="px-3.5 pb-3.5 pt-3">
        <div className="text-sm font-semibold leading-snug">{item.name}</div>
        {item.description && (
          <div className="mt-0.5 line-clamp-1 text-[11px] text-olive">{item.description}</div>
        )}

        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-bold text-caramel">{formatVnd(item.price)}</span>
          <span className="flex items-center gap-1 text-[11px] text-olive">
            <Sparkles size={11} strokeWidth={2} />
            Ngọt · Đá
          </span>
        </div>

        {/* Công thức cần module kho (backend Phase 4) nên chưa có dữ liệu thật */}
        <div className="mt-2 flex items-center gap-1.5 border-t border-olive-mute/40 pt-2 text-[11px] text-wine">
          <AlertCircle size={11} strokeWidth={1.5} />
          Chưa có công thức
        </div>

        {canEdit && (
          <div className="mt-2.5 flex gap-1.5">
            <button
              onClick={() => onEdit(item)}
              className="flex h-[30px] flex-1 items-center justify-center gap-1 rounded-[7px] border border-olive-mute bg-batter-lt text-[11.5px] font-semibold transition hover:border-rogue hover:text-rogue"
            >
              <Pencil size={12} strokeWidth={2} />
              Sửa
            </button>
            <button
              disabled
              title="Cần module Kho nguyên liệu, sẽ mở khi làm xong phase kho"
              className="flex h-[30px] flex-1 cursor-not-allowed items-center justify-center gap-1 rounded-[7px] border border-rogue/20 bg-rogue/8 text-[11.5px] font-semibold text-rogue opacity-45"
            >
              <BookOpen size={12} strokeWidth={1.5} />
              Công thức
            </button>
            <button
              onClick={() => onToggle(item)}
              disabled={toggling}
              title={item.active ? 'Tạm ẩn món' : 'Bán lại món'}
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-olive-mute bg-batter-lt text-olive transition hover:border-wine hover:text-wine disabled:opacity-50"
            >
              {toggling ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Power size={12} strokeWidth={2} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
