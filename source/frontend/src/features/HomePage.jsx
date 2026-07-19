import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useAuthStore } from '../stores/authStore';

/** Trang tạm sau khi đăng nhập. Sẽ thay bằng Dashboard hoặc POS ở phase sau. */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <AppShell>
      <div className="px-7 py-8">
        <h1 className="font-display text-2xl italic">Chào {user?.fullName}</h1>
        <p className="mt-0.5 text-[12.5px] text-olive">
          Các mục mờ ở thanh bên là màn hình chưa được dựng.
        </p>

        <div className="mt-7 grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          <Link
            to="/menu"
            className="rounded-lg border border-olive-mute/60 bg-cream p-5 shadow-[0_1px_3px_rgba(28,21,16,0.05),0_4px_10px_rgba(28,21,16,0.04)] transition hover:-translate-y-0.5 hover:border-rogue hover:shadow-[0_2px_8px_rgba(28,21,16,0.07),0_12px_24px_rgba(58,61,46,0.1)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-rogue to-rogue-dk text-cream shadow-[0_3px_10px_rgba(58,61,46,0.3)]">
              <UtensilsCrossed size={18} strokeWidth={1.5} />
            </span>
            <h2 className="mt-3.5 font-display text-lg italic">Menu</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-olive">
              Danh mục, món và giá bán.
              {user?.role === 'ADMIN' ? ' Thêm, sửa, tạm ẩn món.' : ' Chỉ xem.'}
            </p>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
