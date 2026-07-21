import { Link } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { visibleSections } from '../components/layout/navigation';
import { useAuthStore } from '../stores/authStore';

/**
 * Màn hình chính sau khi đăng nhập: bảng chọn màn hình.
 *
 * <p>Cố ý **không** có thanh bên — ở đây các ô bấm đã to và rõ hơn hẳn, thêm
 * thanh bên nữa thì cùng một danh sách hiện hai lần cạnh nhau.
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const sections = visibleSections(user?.role === 'ADMIN');

  return (
    <AppShell showSidebar={false}>
      <div className="mx-auto max-w-5xl px-7 py-8">
        <h1 className="font-display text-2xl italic">Chào {user?.fullName}</h1>
        <p className="mt-0.5 text-[12.5px] text-olive">
          Chọn màn hình để bắt đầu. Ô mờ là màn hình chưa được dựng.
        </p>

        {sections.map((section) => (
          <section key={section.title} className="mt-7">
            <h2 className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-olive">
              {section.title}
            </h2>
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {section.items.map((item) => (
                <Tile key={item.to} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function Tile({ item }) {
  const Icon = item.icon;
  const shell = 'block rounded-lg border p-5 transition';

  const body = (
    <>
      <span
        className={`grid h-10 w-10 place-items-center rounded-lg ${
          item.ready
            ? 'bg-gradient-to-br from-rogue to-rogue-dk text-cream shadow-[0_3px_10px_rgba(58,61,46,0.3)]'
            : 'bg-olive-mute/30 text-olive'
        }`}
      >
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <h3 className="mt-3.5 font-display text-lg italic">{item.label}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-olive">{item.description}</p>
      {!item.ready && (
        <span className="mt-2.5 inline-block text-[10px] font-bold uppercase tracking-[0.08em] text-olive">
          Chưa dựng
        </span>
      )}
    </>
  );

  if (!item.ready) {
    return (
      <div
        title="Màn hình này chưa được dựng"
        className={`${shell} cursor-not-allowed border-olive-mute/40 bg-cream/50 opacity-60`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      to={item.to}
      className={`${shell} border-olive-mute/60 bg-cream shadow-[0_1px_3px_rgba(28,21,16,0.05),0_4px_10px_rgba(28,21,16,0.04)] hover:-translate-y-0.5 hover:border-rogue hover:shadow-[0_2px_8px_rgba(28,21,16,0.07),0_12px_24px_rgba(58,61,46,0.1)]`}
    >
      {body}
    </Link>
  );
}
