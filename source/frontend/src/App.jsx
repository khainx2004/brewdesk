import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { registerAuthHandlers } from './services/api';
import LoginPage from './features/auth/LoginPage';
import ChangePasswordPage from './features/auth/ChangePasswordPage';
import HomePage from './features/HomePage';
import MenuPage from './features/menu/MenuPage';
import PosPage from './features/pos/PosPage';

/**
 * Chặn hai lớp:
 * - chưa đăng nhập thì về màn đăng nhập
 * - đã đăng nhập nhưng còn cờ bắt đổi mật khẩu thì ép ở lại màn đổi mật khẩu
 *
 * Cố ý **không** nhớ trang đang mở để quay lại sau khi đăng nhập. Đăng nhập
 * xong luôn về màn hình chính — ca sau thường là người khác, mở thẳng vào POS
 * của ca trước dễ khiến họ tưởng vẫn đang là phiên cũ.
 */
function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }
  if (user?.mustChangePassword) {
    return <Navigate to="/doi-mat-khau" replace />;
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
