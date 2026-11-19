import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconArrowLeft, IconLoader2, IconMail, IconMailCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { forgotPassword } from '../../api/auth';
import { TextField } from '../../components/TextField';
import { applyFieldErrors, errorMessage } from '../../lib/apiErrors';
import { AuthCard } from './AuthLayout';
import { forgotPasswordSchema } from './authSchemas';

/** Screen 3. The answer is the same whether or not the email has an account, so accounts can't be guessed. */
export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), mode: 'onTouched', defaultValues: { email: '' } });

  async function onSubmit({ email }) {
    setFormError(null);
    setSent(false);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (error) {
      if (!applyFieldErrors(error, setError, ['email'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <AuthCard>
      <h2 className="mb-1 text-[22px]">Forgot password?</h2>
      <p className="mb-[18px] text-muted">We'll email you a reset link.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          icon={IconMail}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        {formError && (
          <p className="field-error mb-3" role="alert">
            <IconAlertCircle size={16} aria-hidden="true" /> {formError}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      {sent && (
        <div className="mt-4 rounded-xl bg-green-l p-3.5 text-sm text-[#05603f]" role="status">
          <b className="inline-flex items-center gap-1">
            <IconMailCheck size={17} aria-hidden="true" /> Check your inbox.
          </b>{' '}
          If an account exists for this email, a link is on its way. It works once and expires in 30 minutes.
        </div>
      )}

      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="link inline-flex items-center gap-1">
          <IconArrowLeft size={16} aria-hidden="true" /> Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
