import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Coffee,
  FileText,
  Monitor,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react';

/**
 * Nguồn duy nhất cho điều hướng: thanh bên và các ô bấm ở màn hình chào đều đọc
 * từ đây. Khai hai nơi thì sớm muộn cũng lệch — dựng xong màn hình mới mà quên
 * bật ở một chỗ.
 *
 * `ready: false` nghĩa là màn hình chưa được dựng: hiện mờ và không bấm được,
 * thay vì dẫn người dùng tới trang trắng.
 */
export const NAV_SECTIONS = [
  {
    title: 'Vận hành',
    items: [
      {
        to: '/pos',
        label: 'POS Bán hàng',
        icon: Monitor,
        ready: true,
        description: 'Lên đơn, tính tiền và trừ kho theo công thức.',
      },
      {
        to: '/checklist',
        label: 'Checklist',
        icon: ClipboardCheck,
        ready: true,
        description: 'Đầu ca, cuối ca và công việc định kỳ.',
      },
      {
        to: '/qc',
        label: 'Test cafe',
        icon: Coffee,
        ready: false,
        description: 'Chấm điểm chua, đậm, ngọt theo từng ca.',
      },
      {
        to: '/ban-giao-ca',
        label: 'Bàn giao ca',
        icon: FileText,
        ready: true,
        description: 'Đối soát tiền mặt cuối ca.',
      },
    ],
  },
  {
    title: 'Quản lý',
    items: [
      {
        to: '/menu',
        label: 'Menu',
        icon: UtensilsCrossed,
        ready: true,
        description: 'Danh mục, món, giá bán và công thức nguyên liệu.',
      },
      {
        to: '/kho',
        label: 'Kho nguyên liệu',
        icon: Boxes,
        ready: false,
        description: 'Tồn kho, nhập hàng và nhà cung cấp.',
      },
      {
        to: '/nhan-vien',
        label: 'Nhân viên',
        icon: UsersRound,
        ready: false,
        adminOnly: true,
        description: 'Tạo tài khoản và phân quyền.',
      },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      {
        to: '/thong-ke',
        label: 'Thống kê',
        icon: BarChart3,
        ready: false,
        adminOnly: true,
        description: 'Doanh thu, món bán chạy và hao hụt.',
      },
      {
        to: '/kiem-ke',
        label: 'Kiểm kê kho',
        icon: FileText,
        ready: false,
        description: 'Phiếu kiểm kê hàng tuần.',
      },
    ],
  },
];

/** Lọc theo quyền: mục adminOnly chỉ hiện với ADMIN. */
export function visibleSections(isAdmin) {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((section) => section.items.length > 0);
}

const ALL_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * Đường dẫn này có phải màn hình chỉ dành cho ADMIN không.
 *
 * Tra ngược từ chính `NAV_SECTIONS` chứ không gắn cờ ở từng `<Route>`: ẩn mục
 * trên thanh bên **không phải** là chặn — gõ thẳng URL vẫn vào được. Đọc chung
 * một nguồn thì thêm màn hình `adminOnly` mới là được chặn sẵn, không phải nhớ
 * sửa hai chỗ.
 */
export function isAdminOnlyPath(pathname) {
  return ALL_ITEMS.some(
    (item) =>
      item.adminOnly && (pathname === item.to || pathname.startsWith(`${item.to}/`)),
  );
}
