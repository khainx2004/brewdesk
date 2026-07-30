import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Coffee,
  FileText,
  KeyRound,
  LogOut,
  Monitor,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react';
import MobileTabBar from '../components/layout/MobileTabBar';
import { useAuthStore } from '../stores/authStore';
import { useShift } from '../hooks/useShift';

// Nhóm vận hành — mọi vai trò đều dùng hằng ngày (4 tab bar + Bàn giao ca).
const OPS_TILES = [
  { to: '/m/pos', label: 'POS bán hàng', Icon: Monitor },
  { to: '/m/checklist', label: 'Checklist', Icon: ClipboardCheck },
  { to: '/m/test-cafe', label: 'Test cafe', Icon: Coffee },
  { to: '/m/kho', label: 'Tồn kho', Icon: Boxes },
  { to: '/m/ban-giao-ca', label: 'Bàn giao ca', Icon: FileText },
];

// Nhóm quản lý — `adminOnly` chỉ hiện với ADMIN (chặn thật ở RequireAuth + backend).
const MANAGE_TILES = [
  { to: '/m/menu', label: 'Menu', Icon: UtensilsCrossed },
  { to: '/m/kiem-ke', label: 'Kiểm kê kho', Icon: ClipboardList },
  { to: '/m/kho-quan-ly', label: 'Kho quản lý', Icon: Boxes },
  { to: '/m/nhan-vien', label: 'Nhân viên', Icon: UsersRound, adminOnly: true },
  { to: '/m/thong-ke', label: 'Thống kê', Icon: BarChart3, adminOnly: true },
];

/**
 * Màn Home mobile (`/m`) — điểm vào sau khi đăng nhập trên điện thoại. Hai nhóm
 * tile (Vận hành + Quản lý, lọc theo vai trò) + chỗ đổi mật khẩu / đăng xuất
 * (khung mobile không có topbar như desktop nên logout đặt ở đây). Tab bar dưới
 * cùng để nhảy nhanh vào 4 màn vận hành chính.
 */
export default function MobileHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { shift, label } = useShift();
  const isAdmin = user?.role === 'ADMIN';
  const shiftText = shift ? ` · ${shift.name}` : label ? ` · ${label}` : '';
  const manageTiles = MANAGE_TILES.filter((t) => !t.adminOnly || isAdmin);

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
        <div className="mhome-sec-title">Vận hành</div>
        <div className="mhome-grid">
          {OPS_TILES.map(({ to, label: tileLabel, Icon }) => (
            <Link key={to} to={to} className="mhome-tile">
              <span className="mhome-tile-ic">
                <Icon size={21} strokeWidth={1.6} />
              </span>
              <span className="mhome-tile-label">{tileLabel}</span>
            </Link>
          ))}
        </div>

        <div className="mhome-sec-title">Quản lý</div>
        <div className="mhome-grid">
          {manageTiles.map(({ to, label: tileLabel, Icon }) => (
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
