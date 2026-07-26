import { NavLink } from 'react-router-dom';
import { Boxes, ClipboardCheck, Coffee, Monitor } from 'lucide-react';

/**
 * Thanh điều hướng dưới cùng cho các màn hình mobile của nhân viên — bám
 * `design/kho_tra_cuu_mobile_mockup`. Dùng chung cho cả ba màn mobile
 * (Checklist, Test cafe, Tra cứu tồn kho) nên khai một chỗ.
 *
 * `active` chọn tab đang sáng. Tab Test cafe hiện trỏ tạm về màn desktop `/qc`;
 * khi dựng bản mobile của màn đó thì đổi `to` sang route mobile tương ứng.
 */
const TABS = [
  { key: 'pos', label: 'POS', to: '/pos', Icon: Monitor },
  { key: 'checklist', label: 'Checklist', to: '/m/checklist', Icon: ClipboardCheck },
  { key: 'qc', label: 'Test cafe', to: '/qc', Icon: Coffee },
  { key: 'kho', label: 'Kho', to: '/m/kho', Icon: Boxes },
];

export default function MobileTabBar({ active }) {
  return (
    <nav className="mtab">
      {TABS.map(({ key, label, to, Icon }) => (
        <NavLink key={key} to={to} className={`mtab-btn${active === key ? ' active' : ''}`}>
          <Icon size={19} strokeWidth={1.6} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
