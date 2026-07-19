import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { errorMessage } from '../../services/api';
import LoginShell from './LoginShell';

export default function ChangePasswordPage() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const currentPassword = watch('currentPassword');
  const newPassword = watch('newPassword');

  const longEnough = newPassword.length >= 8;
  const different = newPassword.length > 0 && newPassword !== currentPassword;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(errorMessage(error));
    }
  };

  return (
    <LoginShell>
      <h2>đặt mật khẩu riêng</h2>
      <div className="sub">lần đầu vào ca</div>

      {serverError ? (
        <div className="alert" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          {serverError}
        </div>
      ) : (
        <div className="notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          mật khẩu quản lý cấp chỉ dùng được một lần — đặt mật khẩu riêng của bạn để
          tiếp tục.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={`field ${errors.currentPassword ? 'invalid' : ''}`}>
          <label htmlFor="currentPassword">mật khẩu quản lý cấp</label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register('currentPassword', { required: true })}
          />
        </div>

        <div className={`field ${errors.newPassword ? 'invalid' : ''}`}>
          <label htmlFor="newPassword">mật khẩu mới</label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register('newPassword', {
              required: true,
              minLength: 8,
              validate: (value) => value !== currentPassword,
            })}
          />
        </div>

        <div className="rules">
          <div className={`rule ${longEnough ? 'met' : ''}`}>
            <span className="dot">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            từ 8 ký tự trở lên
          </div>
          <div className={`rule ${different ? 'met' : ''}`}>
            <span className="dot">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            khác mật khẩu quản lý cấp
          </div>
        </div>

        <div className={`field ${errors.confirmPassword ? 'invalid' : ''}`}>
          <label htmlFor="confirmPassword">nhập lại mật khẩu mới</label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register('confirmPassword', {
              required: true,
              validate: (value) => value === newPassword,
            })}
          />
        </div>

        {errors.confirmPassword && (
          <div className="alert" role="alert" style={{ marginTop: '-0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            hai ô mật khẩu mới chưa khớp nhau
          </div>
        )}

        <button className="btn" type="submit" disabled={isSubmitting || !longEnough || !different}>
          {isSubmitting ? (
            <>
              <span className="spinner" />
              đang lưu...
            </>
          ) : (
            'lưu và vào ca'
          )}
        </button>
      </form>
    </LoginShell>
  );
}
