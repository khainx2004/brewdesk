import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useAuthStore } from '../stores/authStore';

/**
 * Trang tạm sau khi đăng nhập. Sẽ thay bằng Dashboard hoặc POS ở phase sau.
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <AppShell>
      <h1 className="font-display text-3xl italic">Chào {user?.fullName}</h1>
      <p className="mt-2 text-sm text-caramel">
        Các màn hình còn lại sẽ được dựng ở những phase sau.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        <Link
          to="/menu"
          className="group rounded-xl border border-olive-mute bg-batter-lt p-6 shadow-card transition hover:-translate-y-[3px] hover:shadow-card-hover"
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-rogue text-cream shadow-cta">
            <UtensilsCrossed size={19} strokeWidth={1.5} />
          </span>
          <h2 className="mt-4 font-display text-xl italic">Menu</h2>
          <p className="mt-1 text-sm leading-relaxed text-olive">
            Danh mục, món và giá bán.
            {user?.role === 'ADMIN' ? ' Thêm, sửa, tạm ngừng bán.' : ' Chỉ xem.'}
          </p>
        </Link>
      </div>
    </AppShell>
  );
}
