import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconLoader2, IconLock, IconMail } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { PasswordField, TextField } from '../../components/TextField';
import { applyFieldErrors, errorMessage } from '../../lib/apiErrors';
import { AuthCard } from './AuthLayout';
import { loginSchema } from './authSchemas';
import { LoginBanner } from './Banner';
import { DemoLogin } from './DemoLogin';

export function LoginPage() {
  const { login, sessionEnded } = useAuth();
  const location = useLocation();
  const [formError, setFormError] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), mode: 'onTouched', defaultValues: { email: '', password: '' } });

  // A 429 wins; then a session that ended by itself; then a note another page left (reset, delete).
  let banner = location.state?.note;
  if (sessionEnded) banner = 'session-ended';
  if (rateLimited) banner = 'too-many-attempts';

  async function onSubmit(values) {
    setFormError(null);
    setRateLimited(false);
    try {
      await login(values); // GuestOnly then sends the user on.
    } catch (error) {
      if (error.code === 'INVALID_CREDENTIALS') {
        setFormError("That email or password doesn't match. Try again.");
      } else if (error.code === 'RATE_LIMITED') {
        setRateLimited(true);
      } else if (!applyFieldErrors(error, setError, ['email', 'password'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <AuthCard banner={banner && <LoginBanner kind={banner} />}>
      <h2 className="mb-1 text-2xl">Log in</h2>
      <p className="mb-5 text-muted">Welcome back. Enter your details.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          icon={IconMail}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          icon={IconLock}
          autoComplete="current-password"
          error={errors.password?.message}
          className="mb-0"
          {...register('password')}
        />
        {formError && (
          <p className="field-error" role="alert">
            <IconAlertCircle size={16} aria-hidden="true" /> {formError}
          </p>
        )}
        <div className="mt-3 mb-[18px] flex justify-end">
          <Link to="/forgot-password" className="link">
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-[18px] text-center text-sm text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="link">
          Sign up free
        </Link>
      </p>

      {/* Shown only when the backend runs in demo mode. */}
      <DemoLogin />
    </AuthCard>
  );
}
