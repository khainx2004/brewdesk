import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { errorMessage } from '../../services/api';
import LoginShell from './LoginShell';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { username: '', password: '', persist: true } });

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const user = await login(values);
      if (user.mustChangePassword) {
        navigate('/doi-mat-khau', { replace: true });
        return;
      }
      // Quay lại đúng trang người dùng định vào trước khi bị chặn
      const target = location.state?.from ?? '/';
      navigate(target, { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  const invalid = Boolean(serverError);

  return (
    <LoginShell>
      <h2>đăng nhập</h2>
      <div className="sub">dành cho người nhà &amp; nhân viên</div>

      {serverError && (
        <div className="alert" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={`field ${errors.username ? 'invalid' : ''}`}>
          <label htmlFor="username">tên đăng nhập</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="vd: an.pha_che"
            disabled={isSubmitting}
            {...register('username', { required: 'chưa nhập tên đăng nhập' })}
          />
        </div>

        <div className={`field ${errors.password || invalid ? 'invalid' : ''}`}>
          <label htmlFor="password">mật khẩu</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register('password', { required: 'chưa nhập mật khẩu' })}
          />
        </div>

        <div className="row-between">
          <label htmlFor="persist">
            <input id="persist" type="checkbox" disabled={isSubmitting} {...register('persist')} />
            giữ đăng nhập
          </label>
          <span className="hint">quên mật khẩu? nhắn quản lý</span>
        </div>

        <button className="btn" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner" />
              đang mở ca...
            </>
          ) : (
            'vào ca'
          )}
        </button>
      </form>
    </LoginShell>
  );
}
