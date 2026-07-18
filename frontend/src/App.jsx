import { Routes, Route } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { formatVnd } from './utils/fmt';

const PALETTE = [
  ['--ink-deep', 'Chữ chính'],
  ['--cocoa', 'Topbar'],
  ['--rogue', 'Accent chính'],
  ['--caramel', 'Giá tiền'],
  ['--olive', 'Border active'],
  ['--olive-mute', 'Border thường'],
  ['--batter-lt', 'Nền card'],
  ['--batter-warm', 'Sunken'],
  ['--wine', 'Cảnh báo'],
  ['--cream', 'Surface'],
];

// Trang tạm để kiểm tra design token đã nạp đúng chưa.
// Sẽ thay bằng router thật khi code màn hình Đăng nhập và POS.
function ScaffoldCheck() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <div className="mb-10 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-rogue text-cream shadow-cta">
          <Coffee size={22} strokeWidth={1.5} />
        </span>
        <div>
          <h1 className="font-display text-3xl italic leading-none">BrewDesk</h1>
          <p className="mt-1 text-sm text-cocoa">Khung dự án đã sẵn sàng</p>
        </div>
      </div>

      <section className="rounded-2xl bg-batter-lt p-6 shadow-card">
        <h2 className="font-display text-xl italic">Bảng màu</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {PALETTE.map(([token, label]) => (
            <div key={token}>
              <div
                className="h-14 rounded-lg border border-olive-mute"
                style={{ background: `var(${token})` }}
              />
              <p className="mt-1.5 text-xs font-medium">{label}</p>
              <p className="text-[11px] text-olive">{token}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-8 font-display text-xl italic">Kiểu chữ & định dạng</h2>
        <p className="mt-2 text-sm">
          Plus Jakarta Sans cho phần thân — giá mẫu{' '}
          <span className="font-semibold text-caramel">{formatVnd(25000)}</span>
        </p>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<ScaffoldCheck />} />
    </Routes>
  );
}
