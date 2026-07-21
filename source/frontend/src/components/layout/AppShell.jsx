import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Coffee,
  FileText,
  LogOut,
  Monitor,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

/**
 * Mục nào chưa có màn hình thì để ready:false — hiện mờ và không bấm được,
 * thay vì dẫn người dùng tới trang trắng.
 */
const NAV_SECTIONS = [
  {
    title: 'Vận hành',
    items: [
      { to: '/pos', label: 'POS Bán hàng', icon: Monitor, ready: true },
      { to: '/checklist', label: 'Checklist', icon: ClipboardCheck, ready: false },
      { to: '/qc', label: 'Test cafe', icon: Coffee, ready: false },
      { to: '/ban-giao-ca', label: 'Bàn giao ca', icon: FileText, ready: false },
    ],
  },
  {
    title: 'Quản lý',
    items: [
      { to: '/menu', label: 'Menu', icon: UtensilsCrossed, ready: true },
      { to: '/kho', label: 'Kho nguyên liệu', icon: Boxes, ready: false },
      { to: '/nhan-vien', label: 'Nhân viên', icon: UsersRound, ready: false, adminOnly: true },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { to: '/thong-ke', label: 'Thống kê', icon: BarChart3, ready: false, adminOnly: true },
      { to: '/kiem-ke', label: 'Kiểm kê kho', icon: FileText, ready: false },
    ],
  },
];

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

export default function AppShell({ children }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="flex h-screen flex-col bg-batter">
      <header className="relative z-10 flex h-[60px] shrink-0 items-center justify-between bg-gradient-to-r from-ink-deep via-[#2E1E12] to-cocoa-lt px-7 shadow-[0_1px_0_rgba(157,145,103,0.2),0_4px_20px_rgba(28,21,16,0.45)]">
        {/* Sidebar không có mục Trang chủ nên logo là đường quay về.
            Tên quán viết thường, không nghiêng — giống hệt màn đăng nhập. */}
        <NavLink to="/" className="flex items-baseline gap-3">
          <span className="font-display text-xl lowercase tracking-wide text-batter-lt">
            nhahaisaus
          </span>
          <span className="text-[9.5px] font-bold uppercase tracking-[0.2em] text-olive">
            {isAdmin ? 'Admin' : 'Nhân viên'}
          </span>
        </NavLink>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <span className="rounded-full border border-caramel/35 bg-caramel/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-caramel">
              Admin
            </span>
          )}
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
        <nav className="flex w-56 shrink-0 flex-col gap-1 bg-gradient-to-b from-[#211710] to-ink-deep px-3 py-5">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter((i) => !i.adminOnly || isAdmin);
            if (visible.length === 0) return null;
            return (
              <div key={section.title}>
                <div className="px-2.5 pb-1.5 pt-3 text-[9.5px] font-bold uppercase tracking-[0.12em] text-olive/50 first:pt-0">
                  {section.title}
                </div>
                {visible.map((item) => {
                  const Icon = item.icon;
                  const base =
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition';

                  if (!item.ready) {
                    return (
                      <div
                        key={item.to}
                        title="Màn hình này chưa được dựng"
                        className={`${base} cursor-not-allowed text-olive-mute/30`}
                      >
                        <Icon size={16} strokeWidth={1.5} className="shrink-0 opacity-60" />
                        {item.label}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `${base} ${
                          isActive
                            ? 'bg-rogue/50 text-batter-lt'
                            : 'text-olive-mute/65 hover:bg-white/5 hover:text-olive-mute'
                        }`
                      }
                    >
                      <Icon size={16} strokeWidth={1.5} className="shrink-0 opacity-80" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
