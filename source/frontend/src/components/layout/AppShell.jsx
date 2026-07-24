import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Clock, LogOut, PanelLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useShift } from '../../hooks/useShift';
import { visibleSections } from './navigation';

const COLLAPSE_KEY = 'brewdesk_sidebar_collapsed';

function initials(fullName) {
  if (!fullName) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Khung chung: topbar + thanh bên gập được.
 *
 * @param topbarExtra  Nội dung riêng của từng màn chèn vào topbar (POS dùng để
 *                     hiện badge ca làm việc và đồng hồ).
 * @param showSidebar  Tắt hẳn thanh bên cho màn hình chào — ở đó đã có sẵn các
 *                     ô bấm lớn nên thanh bên chỉ lặp lại.
 */
export default function AppShell({ children, topbarExtra, showSidebar = true }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === 'ADMIN';
  const { shift, label: shiftLabel, clock } = useShift();

  // Nhớ lựa chọn gập/mở giữa các lần vào: nhân viên quen dùng POS rộng hết cỡ
  // thì không phải gập lại mỗi ca.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const sections = visibleSections(isAdmin);

  return (
    <div className="flex h-screen flex-col bg-batter">
      <header className="relative z-10 flex h-[60px] shrink-0 items-center justify-between gap-4 bg-gradient-to-r from-ink-deep via-[#2E1E12] to-cocoa-lt px-5 shadow-[0_1px_0_rgba(157,145,103,0.2),0_4px_20px_rgba(28,21,16,0.45)]">
        <div className="flex items-center gap-3">
          {showSidebar && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Hiện thanh bên' : 'Ẩn thanh bên'}
              aria-expanded={!collapsed}
              title="Thu gọn/mở sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/[0.07] text-batter transition-colors duration-150 hover:bg-white/[0.13]"
            >
              <PanelLeft size={17} strokeWidth={1.75} />
            </button>
          )}

          <NavLink to="/" className="flex items-baseline gap-3" title="Về màn hình chính">
            <span className="font-display text-xl lowercase tracking-wide text-batter-lt">
              nhahaisaus
            </span>
            <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-olive">
              {isAdmin ? 'Admin' : 'Nhân viên'}
            </span>
          </NavLink>
        </div>

        <div className="topbar-right">
          {topbarExtra}
          {topbarExtra && <div className="tb-divider" />}

          <div className="tb-shift-chip">
            <span className="tb-shift-dot" />
            <span className="tb-shift-label">{shift ? shift.name : shiftLabel || '…'}</span>
            {shift && <span className="tb-shift-sub">· {shift.code}</span>}
            <span className="tb-shift-sep" />
            <span className="tb-shift-time">
              <Clock size={11} strokeWidth={2} />
              {clock}
            </span>
          </div>

          <div className="tb-divider" />

          <div className="tb-staff-chip">
            <span className="tb-avatar">{initials(user?.fullName)}</span>
            <div className="tb-staff-info">
              <span className="tb-staff-name">{user?.fullName}</span>
              <span className="tb-staff-role">{isAdmin ? 'Quản lý' : 'Nhân viên'}</span>
            </div>
          </div>

          <button className="tb-logout-btn" title="Đăng xuất" onClick={logout}>
            <LogOut size={15} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <nav
            aria-hidden={collapsed}
            className={`shrink-0 overflow-hidden bg-gradient-to-b from-[#211710] to-ink-deep transition-[width] duration-[350ms] ease-[cubic-bezier(.34,1.2,.64,1)] ${
              collapsed ? 'w-0' : 'w-56'
            }`}
          >
            {/* Lớp trong giữ bề rộng cố định + padding; nav ngoài co width về 0
                thật (không kẹt ở padding) và overflow-hidden cắt lớp này mượt. */}
            <div className="flex w-56 flex-col gap-1 px-3 py-5">
              {sections.map((section) => (
                <div key={section.title} className="flex flex-col gap-1">
                  <div className="px-2.5 pb-0.5 pt-2.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[rgba(157,145,103,0.5)] first:pt-0">
                    {section.title}
                  </div>
                  {section.items.map((item) => (
                    <NavItem key={item.to} item={item} tabbable={!collapsed} />
                  ))}
                </div>
              ))}
            </div>
          </nav>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/**
 * Đúng y `.nav-item` / `.active` / `:hover` trong mockup, KHÔNG viền:
 *
 * <ul>
 *   <li>Mục thường: chữ rgba(196,186,160,.65) — mờ nhẹ, vẫn đọc rõ. Không nền,
 *       không viền, không bo góc.
 *   <li>Hover: nền rgba(255,255,255,.05), chữ sáng lên olive-mute.
 *   <li>Mục đang mở: nền đặc rgba(58,61,46,.5) bo góc 10px + chữ sáng batter-lt.
 *       Là một khối nền phẳng, KHÔNG phải khung outline.
 * </ul>
 *
 * Cố ý dùng thẳng rgba của mockup thay vì bộ chỉnh opacity của Tailwind
 * (`text-olive-mute/65`): color-mix trên một số trình duyệt kéo màu về đen làm
 * chữ 65% thành gần như mất. rgba trực tiếp thì hoà alpha chuẩn, hiện đúng.
 */
function NavItem({ item, tabbable }) {
  const Icon = item.icon;
  const base =
    'flex w-full items-center gap-2.5 rounded px-3 py-[9px] text-left text-[13px] font-medium leading-tight transition';

  if (!item.ready) {
    return (
      <div
        title="Màn hình này chưa được dựng"
        className={`${base} cursor-not-allowed text-[rgba(196,186,160,0.3)]`}
      >
        <Icon size={16} strokeWidth={1.5} className="shrink-0 opacity-80" />
        {item.label}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      tabIndex={tabbable ? undefined : -1}
      className={({ isActive }) =>
        `${base} ${
          isActive
            ? 'bg-[rgba(58,61,46,0.5)] text-batter-lt'
            : 'text-[rgba(196,186,160,0.65)] hover:bg-[rgba(255,255,255,0.05)] hover:text-olive-mute'
        }`
      }
    >
      <Icon size={16} strokeWidth={1.5} className="shrink-0 opacity-80" />
      {item.label}
    </NavLink>
  );
}
