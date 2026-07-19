import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { registerAuthHandlers } from './services/api';
import LoginPage from './features/auth/LoginPage';
import ChangePasswordPage from './features/auth/ChangePasswordPage';
import HomePage from './features/HomePage';
import MenuPage from './features/menu/MenuPage';

/**
 * Chặn hai lớp:
 * - chưa đăng nhập thì về màn đăng nhập, nhớ trang định vào để quay lại sau
 * - đã đăng nhập nhưng còn cờ bắt đổi mật khẩu thì ép ở lại màn đổi mật khẩu
 */
function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />;
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
