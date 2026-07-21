import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import AppShell from '../components/layout/AppShell';

/**
 * Nhân viên mở một màn hình chỉ dành cho quản lý.
 *
 * Nói thẳng là không có quyền, thay vì lặng lẽ đá về màn hình chính — bị đẩy đi
 * mà không hiểu vì sao thì người dùng sẽ bấm lại vài lần rồi báo là app lỗi.
 */
export default function ForbiddenPage() {
  return (
    <AppShell>
      <div className="grid h-full place-items-center px-7 py-10">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-wine/10 text-wine">
            <ShieldOff size={22} strokeWidth={1.5} />
          </span>
          <h1 className="mt-4 font-display text-2xl italic">Không có quyền</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-olive">
            Màn hình này chỉ dành cho quản lý. Nếu bạn cần dùng, nhắn quản lý để
            được cấp quyền.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex h-[38px] items-center rounded-lg bg-gradient-to-b from-rogue to-rogue-dk px-4 text-[12.5px] font-semibold text-cream shadow-[0_3px_10px_rgba(58,61,46,0.3)] transition hover:brightness-110"
          >
            Về màn hình chính
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
