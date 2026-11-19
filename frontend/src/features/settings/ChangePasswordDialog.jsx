import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconLoader2, IconLock } from '@tabler/icons-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { changePassword } from '../../api/profile';
import { Dialog } from '../../components/Dialog';
import { PasswordField } from '../../components/TextField';
import { applyFieldErrors, errorMessage } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { newPasswordField } from '../auth/authSchemas';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: newPasswordField,
});

/** Screen 14. The backend logs out every other browser and keeps this one logged in with a new token. */
export function ChangePasswordDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="change-password-title">
      <ChangePasswordForm onClose={onClose} />
    </Dialog>
  );
}

function ChangePasswordForm({ onClose }) {
  const toast = useToast();
  const [formError, setFormError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  async function onSubmit(values) {
    setFormError(null);
    try {
      await changePassword(values);
      onClose();
      toast.success('Password changed');
    } catch (error) {
      if (error.code === 'WRONG_PASSWORD') {
        setError('currentPassword', { message: "That password isn't right." }, { shouldFocus: true });
      } else if (!applyFieldErrors(error, setError, ['currentPassword', 'newPassword'])) {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 id="change-password-title" className="mb-1 text-lg">
        Change password
      </h3>
      <p className="mb-[18px] text-sm text-muted">Other browsers are logged out. This one stays logged in.</p>
      <PasswordField
        label="Current password"
        icon={IconLock}
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <PasswordField
        label="New password"
        icon={IconLock}
        autoComplete="new-password"
        hint="At least 8 characters, with a number."
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      {formError && (
        <p className="field-error mb-3" role="alert">
          <IconAlertCircle size={16} aria-hidden="true" /> {formError}
        </p>
      )}
      <div className="flex justify-end gap-2.5">
        <button type="button" className="btn btn-line" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          Save password
        </button>
      </div>
    </form>
  );
}
