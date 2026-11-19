import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconLinkOff, IconLoader2, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { resetPassword } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';
import { PasswordField } from '../../components/TextField';
import { applyFieldErrors, errorMessage } from '../../lib/apiErrors';
import { AuthCard } from './AuthLayout';
import { resetPasswordSchema } from './authSchemas';

const EXPIRED = 'This link has expired.';

/**
 * Screen 4, behind the link in the reset email (/reset-password?token=...). The page can't know
 * the email, and the link is only checked when the form is sent: a used, expired or replaced
 * link then shows the red panel. A page opened without a token shows it at once.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { endSessionLocally } = useAuth();
  const [linkProblem, setLinkProblem] = useState(token ? null : EXPIRED);
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await resetPassword({ token, password: values.password });
      // A reset logs out every session, including one in this browser; a reset doesn't log you in.
      endSessionLocally();
      navigate('/login', { replace: true, state: { note: 'password-reset' } });
    } catch (error) {
      const tokenDetail = error.details?.find((detail) => detail.field === 'token');
      if (error.code === 'RESET_LINK_EXPIRED') {
        setLinkProblem(EXPIRED);
      } else if (tokenDetail) {
        setLinkProblem(tokenDetail.message); // "This link is not valid."
      } else if (!applyFieldErrors(error, setError, ['password'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <AuthCard>
      <h2 className="mb-1 text-[22px]">Set a new password</h2>
      <p className="mb-[18px] text-muted">Choose a new password for your SubPulse account.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordField
          label="New password"
          icon={IconLock}
          autoComplete="new-password"
          error={errors.password?.message}
          hint="At least 8 characters, with a number."
          {...register('password')}
        />
        <PasswordField
          label="Confirm password"
          icon={IconLock}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {formError && (
          <p className="field-error mb-3" role="alert">
            <IconAlertCircle size={16} aria-hidden="true" /> {formError}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting || linkProblem !== null}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>

      {linkProblem && (
        <div className="mt-4 rounded-xl bg-red-l p-3.5 text-sm text-[#a51d1d]" role="alert">
          <b className="inline-flex items-center gap-1">
            <IconLinkOff size={17} aria-hidden="true" /> {linkProblem}
          </b>{' '}
          Ask for a new one.{' '}
          <Link to="/forgot-password" className="font-bold underline">
            Send a new link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
