import { Coffee, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

/**
 * Trang tạm sau khi đăng nhập, dùng design system chung (khác hẳn màn đăng nhập)
 * để kiểm chứng hai ngôn ngữ thị giác không lẫn vào nhau.
 * Sẽ thay bằng Dashboard/POS ở các phase sau.
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-batter">
      <header className="flex items-center justify-between bg-gradient-to-r from-ink-deep via-cocoa to-cocoa-lt px-7 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-rogue text-cream">
            <Coffee size={18} strokeWidth={1.5} />
          </span>
          <span className="font-display text-xl italic text-batter-lt">BrewDesk</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-olive-mute">{user?.fullName}</span>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-olive/40 px-3 py-1.5 text-sm text-olive-mute transition hover:border-olive hover:text-batter-lt"
          >
            <LogOut size={15} strokeWidth={1.5} />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl bg-batter-lt p-8 shadow-card">
          <h1 className="font-display text-3xl italic">Đăng nhập thành công</h1>
          <p className="mt-3 text-sm leading-relaxed text-cocoa">
            Đây là trang tạm để kiểm chứng luồng xác thực. Các màn hình thật sẽ được
            dựng ở những phase sau.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-olive-mute pt-6 text-sm">
            <div>
              <dt className="text-olive">Tên đăng nhập</dt>
              <dd className="mt-1 font-medium">{user?.username}</dd>
            </div>
            <div>
              <dt className="text-olive">Vai trò</dt>
              <dd className="mt-1 font-medium">{user?.role}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
