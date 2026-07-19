import { Coffee, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const NAV = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/menu', label: 'Menu' },
];

/** Khung chung cho các màn hình sau khi đăng nhập — dùng design system chung. */
export default function AppShell({ children }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-batter">
      <header className="bg-gradient-to-r from-ink-deep via-cocoa to-cocoa-lt px-6 shadow-[0_4px_20px_rgba(28,21,16,0.35)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-7">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-rogue text-cream">
                <Coffee size={18} strokeWidth={1.5} />
              </span>
              <span className="font-display text-xl italic text-batter-lt">BrewDesk</span>
            </div>

            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm transition ${
                      isActive
                        ? 'bg-batter-lt/15 font-medium text-batter-lt'
                        : 'text-olive-mute hover:text-batter-lt'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <div className="text-sm text-batter-lt">{user?.fullName}</div>
              <div className="text-[11px] text-olive">
                {user?.role === 'ADMIN' ? 'Quản lý' : 'Nhân viên'}
              </div>
            </div>
            <button
              onClick={logout}
              aria-label="Đăng xuất"
              className="grid h-9 w-9 place-items-center rounded-lg border border-olive/30 text-olive-mute transition hover:border-olive hover:text-batter-lt"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
