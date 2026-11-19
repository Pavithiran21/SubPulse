import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconCoins, IconLoader2, IconLock, IconMail, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { SelectField } from '../../components/SelectField';
import { PasswordField, TextField } from '../../components/TextField';
import { TimeZoneField } from '../../components/TimeZoneField';
import { applyFieldErrors, errorMessage } from '../../lib/apiErrors';
import { browserCurrency, CURRENCIES } from '../../lib/enums';
import { browserTimeZone } from '../../lib/timeZones';
import { AuthCard } from './AuthLayout';
import { registerSchema } from './authSchemas';

/** Screen 2. The time zone and currency are pre-filled from the browser. */
export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', password: '', timeZone: browserTimeZone(), currency: browserCurrency() },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await createAccount(values); // GuestOnly then opens the calendar.
    } catch (error) {
      if (!applyFieldErrors(error, setError, ['name', 'email', 'password', 'timeZone', 'currency'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <AuthCard>
      <h2 className="mb-1 text-[22px]">Create your account</h2>
      <p className="mb-[18px] text-muted">Free. No card, no bank linking.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField label="Name" icon={IconUser} autoComplete="name" error={errors.name?.message} {...register('name')} />
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
          autoComplete="new-password"
          error={errors.password?.message}
          hint="At least 8 characters, with a number."
          {...register('password')}
        />
        <div className="grid gap-x-3.5 tab:grid-cols-2">
          <Controller
            control={control}
            name="timeZone"
            render={({ field, fieldState }) => (
              <TimeZoneField
                id="register-time-zone"
                label="Time zone"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
          <SelectField id="register-currency" label="Currency" icon={IconCoins} error={errors.currency?.message} {...register('currency')}>
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.value} {currency.symbol}
              </option>
            ))}
          </SelectField>
        </div>
        {formError && (
          <p className="field-error mb-3" role="alert">
            <IconAlertCircle size={16} aria-hidden="true" /> {formError}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-[18px] text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="link">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
