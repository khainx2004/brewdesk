import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { registerAuthHandlers } from './services/api';
import { isAdminOnlyPath } from './components/layout/navigation';
import { useIsMobile } from './hooks/useIsMobile';
import LoginPage from './features/auth/LoginPage';
import ChangePasswordPage from './features/auth/ChangePasswordPage';
import ForbiddenPage from './features/ForbiddenPage';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './features/HomePage';
import MenuPage from './features/menu/MenuPage';
import ChecklistPage from './features/checklist/ChecklistPage';
import ReconciliationPage from './features/reconciliation/ReconciliationPage';
import QcPage from './features/qc/QcPage';
import StatsPage from './features/reports/StatsPage';
import StockTakePage from './features/inventory/StockTakePage';
import WarehousePage from './features/inventory/WarehousePage';
import MobileStockLookupPage from './features/inventory/MobileStockLookupPage';
import MobileChecklistPage from './features/checklist/MobileChecklistPage';
import MobileQcPage from './features/qc/MobileQcPage';
import MobilePosPage from './features/pos/MobilePosPage';
import MobileHomePage from './features/MobileHomePage';
import MobileReconciliationPage from './features/reconciliation/MobileReconciliationPage';
import MobileMenuPage from './features/menu/MobileMenuPage';
import MobileStockTakePage from './features/inventory/MobileStockTakePage';
import MobileWarehousePage from './features/inventory/MobileWarehousePage';
import MobileStaffPage from './features/staff/MobileStaffPage';
import MobileStatsPage from './features/reports/MobileStatsPage';

/**
 * Cặp route dùng chung desktop ↔ mobile: mọi màn đều có bản mobile riêng nên đều
 * nằm ở đây — mở trên điện thoại tự đẩy sang bản `/m`, mở màn rộng tự về desktop.
 *
 * Lưu ý `/kho` (bản quản lý đầy đủ) map sang `/m/kho-quan-ly`; còn `/m/kho` là màn
 * "Tra cứu tồn kho nhanh" ở tab bar (có mockup riêng), cố ý không nằm trong bảng
 * này để tab bar trỏ tới nó không bị điều hướng đi chỗ khác.
 */
const DESKTOP_TO_MOBILE = {
  '/': '/m',
  '/pos': '/m/pos',
  '/checklist': '/m/checklist',
  '/qc': '/m/test-cafe',
  '/kho': '/m/kho-quan-ly',
  '/ban-giao-ca': '/m/ban-giao-ca',
  '/menu': '/m/menu',
  '/kiem-ke': '/m/kiem-ke',
  '/nhan-vien': '/m/nhan-vien',
  '/thong-ke': '/m/thong-ke',
};
const MOBILE_TO_DESKTOP = Object.fromEntries(
  Object.entries(DESKTOP_TO_MOBILE).map(([d, m]) => [m, d]),
);

/** Đường dẫn nên chuyển tới cho đúng thiết bị, hoặc null nếu đã đúng. */
function deviceRoute(pathname, isMobile) {
  const target = isMobile ? DESKTOP_TO_MOBILE[pathname] : MOBILE_TO_DESKTOP[pathname];
  return target && target !== pathname ? target : null;
}
import StaffPage from './features/staff/StaffPage';
import PosPage from './features/pos/PosPage';

/**
 * Chặn ba lớp:
 * - chưa đăng nhập thì về màn đăng nhập
 * - đã đăng nhập nhưng còn cờ bắt đổi mật khẩu thì ép ở lại màn đổi mật khẩu
 * - nhân viên mở màn hình chỉ dành cho quản lý thì báo không có quyền
 *
 * Lớp thứ ba **không thay thế** việc backend chặn — backend vẫn là chốt thật,
 * đây chỉ để nhân viên gõ nhầm URL thì thấy câu giải thích thay vì một trang
 * hỏng đầy lỗi 403.
 *
 * `useLocation` ở đây chỉ để biết đang mở màn hình nào. Cố ý **không** nhớ trang
 * đang mở để quay lại sau khi đăng nhập: ca sau thường là người khác, mở thẳng
 * vào POS của ca trước dễ khiến họ tưởng vẫn đang là phiên cũ.
 */
function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const isMobile = useIsMobile();

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }
  if (user?.mustChangePassword) {
    return <Navigate to="/doi-mat-khau" replace />;
  }
  // Đưa về đúng luồng thiết bị: điện thoại vào bản /m, màn rộng vào bản desktop.
  const redirect = deviceRoute(pathname, isMobile);
  if (redirect) {
    return <Navigate to={redirect} replace />;
  }
  // Quy path mobile về path desktop chuẩn rồi mới tra quyền: `NAV_SECTIONS` (nguồn
  // duy nhất) chỉ khai path desktop, nhờ vậy `/m/nhan-vien` & `/m/thong-ke` được
  // chặn STAFF y như bản desktop mà không phải khai cờ adminOnly ở hai nơi.
  const canonical = MOBILE_TO_DESKTOP[pathname] ?? pathname;
  if (isAdminOnlyPath(canonical) && user?.role !== 'ADMIN') {
    return <ForbiddenPage />;
  }
  return children;
}

export default function App() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const markMustChangePassword = useAuthStore((s) => s.markMustChangePassword);

  // Nối interceptor với router: hết phiên hoặc bị buộc đổi mật khẩu thì
  // điều hướng trong SPA, không tải lại cả trang.
  useEffect(() => {
    registerAuthHandlers({
      onAuthExpired: () => {
        logout();
        navigate('/dang-nhap', { replace: true });
      },
      onMustChangePassword: () => {
        markMustChangePassword();
        navigate('/doi-mat-khau', { replace: true });
      },
    });
  }, [navigate, logout, markMustChangePassword]);

  return (
    <Routes>
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route path="/doi-mat-khau" element={<ChangePasswordPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
      {/* POS không nằm trong AppShell: mockup đã duyệt cho nó topbar riêng và
          bỏ sidebar để lưới món rộng hết cỡ. Logo trên topbar là đường quay về. */}
      <Route
        path="/pos"
        element={
          <RequireAuth>
            <PosPage />
          </RequireAuth>
        }
      />
      <Route
        path="/checklist"
        element={
          <RequireAuth>
            <ChecklistPage />
          </RequireAuth>
        }
      />
      <Route
        path="/ban-giao-ca"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <ReconciliationPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/qc"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <QcPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/thong-ke"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <StatsPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/menu"
        element={
          <RequireAuth>
            <MenuPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kiem-ke"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <StockTakePage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/nhan-vien"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <StaffPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/kho"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <WarehousePage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      {/* Màn mobile riêng cho nhân viên — ngoài AppShell, có thanh nav dưới cùng. */}
      <Route
        path="/m"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileHomePage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/pos"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobilePosPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/checklist"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileChecklistPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/test-cafe"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileQcPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/ban-giao-ca"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileReconciliationPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/kho"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileStockLookupPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/menu"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileMenuPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/kiem-ke"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileStockTakePage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/kho-quan-ly"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileWarehousePage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/nhan-vien"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileStaffPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route
        path="/m/thong-ke"
        element={
          <RequireAuth>
            <ErrorBoundary>
              <MobileStatsPage />
            </ErrorBoundary>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
