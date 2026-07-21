import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, PanelLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
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
              title={collapsed ? 'Hiện thanh bên' : 'Ẩn thanh bên'}
              className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
                collapsed
                  ? 'border-olive/25 text-olive-mute hover:border-olive hover:bg-white/5 hover:text-batter-lt'
                  : 'border-olive/40 bg-white/10 text-batter-lt hover:bg-white/15'
              }`}
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

        <div className="flex items-center gap-4">
          {topbarExtra}
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-caramel to-[#9A6B38] text-[11px] font-bold text-cream">
              {initials(user?.fullName)}
            </span>
            <span className="text-[13px] font-medium text-olive-mute">{user?.fullName}</span>
          </div>
          <button
            onClick={logout}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="grid h-8 w-8 place-items-center rounded-lg text-olive transition hover:bg-white/5 hover:text-batter-lt"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <nav
            aria-hidden={collapsed}
            className={`flex shrink-0 flex-col gap-1 overflow-hidden bg-gradient-to-b from-[#211710] to-ink-deep transition-[width,padding] duration-200 ${
              collapsed ? 'w-0 px-0 py-5' : 'w-56 px-3 py-5'
            }`}
          >
            {sections.map((section) => (
              <div key={section.title} className="w-[200px]">
                <div className="px-2.5 pb-1.5 pt-3 text-[9.5px] font-bold uppercase tracking-[0.12em] text-olive/60 first:pt-0">
                  {section.title}
                </div>
                {section.items.map((item) => (
                  <NavItem key={item.to} item={item} tabbable={!collapsed} />
                ))}
              </div>
            ))}
          </nav>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/**
 * Trạng thái mặc định phải đọc được ngay, không phải rê chuột vào mới thấy —
 * nhân viên cần nhìn lướt là biết có những màn hình nào.
 *
 * Trang đang mở được đánh dấu bằng ba tín hiệu cùng lúc: nền accent, chữ đậm,
 * và vạch sáng bên trái. Chỉ đổi màu chữ thì trên nền tối rất khó nhận ra.
 */
function NavItem({ item, tabbable }) {
  const Icon = item.icon;
  const base =
    'relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition';

  if (!item.ready) {
    return (
      <div
        title="Màn hình này chưa được dựng"
        className={`${base} cursor-not-allowed font-medium text-olive-mute/35`}
      >
        <Icon size={16} strokeWidth={1.5} className="shrink-0" />
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
            ? 'bg-rogue font-bold text-batter-lt shadow-[inset_3px_0_0_var(--olive)]'
            : 'font-medium text-olive-mute hover:bg-white/[0.07] hover:text-batter-lt'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className="shrink-0" />
          {item.label}
        </>
      )}
    </NavLink>
  );
}
