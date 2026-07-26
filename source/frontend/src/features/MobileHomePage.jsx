import { Link, useNavigate } from 'react-router-dom';
import { Boxes, ClipboardCheck, Coffee, KeyRound, LogOut, Monitor } from 'lucide-react';
import MobileTabBar from '../components/layout/MobileTabBar';
import { useAuthStore } from '../stores/authStore';
import { useShift } from '../hooks/useShift';

const TILES = [
  { to: '/m/pos', label: 'POS bán hàng', Icon: Monitor },
  { to: '/m/checklist', label: 'Checklist', Icon: ClipboardCheck },
  { to: '/m/test-cafe', label: 'Test cafe', Icon: Coffee },
  { to: '/m/kho', label: 'Tồn kho', Icon: Boxes },
];

/**
 * Màn Home mobile (`/m`) — điểm vào sau khi đăng nhập trên điện thoại. Bảng chọn
 * 4 màn mobile + chỗ đổi mật khẩu / đăng xuất (khung mobile không có topbar như
 * desktop nên logout đặt ở đây). Tab bar dưới cùng để nhảy nhanh vào từng màn.
 */
export default function MobileHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { shift, label } = useShift();
  const isAdmin = user?.role === 'ADMIN';
  const shiftText = shift ? ` · ${shift.name}` : label ? ` · ${label}` : '';

  return (
    <div className="mhome">
      <header className="mhome-top">
        <div className="mhome-hello">Chào {user?.fullName}</div>
        <div className="mhome-role">
          {isAdmin ? 'Quản lý' : 'Nhân viên'}
          {shiftText}
        </div>
      </header>

      <div className="mhome-body">
        <div className="mhome-grid">
          {TILES.map(({ to, label: tileLabel, Icon }) => (
            <Link key={to} to={to} className="mhome-tile">
              <span className="mhome-tile-ic">
                <Icon size={21} strokeWidth={1.6} />
              </span>
              <span className="mhome-tile-label">{tileLabel}</span>
            </Link>
          ))}
        </div>

        <div className="mhome-account">
          <button type="button" className="mhome-acc-btn" onClick={() => navigate('/doi-mat-khau')}>
            <KeyRound size={16} strokeWidth={1.8} />
            Đổi mật khẩu
          </button>
          <button type="button" className="mhome-acc-btn danger" onClick={logout}>
            <LogOut size={16} strokeWidth={1.8} />
            Đăng xuất
          </button>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
}
