import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { registerAuthHandlers } from './services/api';
import { isAdminOnlyPath } from './components/layout/navigation';
import LoginPage from './features/auth/LoginPage';
import ChangePasswordPage from './features/auth/ChangePasswordPage';
import ForbiddenPage from './features/ForbiddenPage';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './features/HomePage';
import MenuPage from './features/menu/MenuPage';
import ChecklistPage from './features/checklist/ChecklistPage';
import ReconciliationPage from './features/reconciliation/ReconciliationPage';
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

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }
  if (user?.mustChangePassword) {
    return <Navigate to="/doi-mat-khau" replace />;
  }
  if (isAdminOnlyPath(pathname) && user?.role !== 'ADMIN') {
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
        path="/menu"
        element={
          <RequireAuth>
            <MenuPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
