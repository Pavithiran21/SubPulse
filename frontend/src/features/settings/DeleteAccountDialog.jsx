import { zodResolver } from '@hookform/resolvers/zod';
import { IconAlertCircle, IconLoader2, IconLock, IconUserX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { deleteAccount } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import { getStatusCounts } from '../../api/subscriptions';
import { useAuth } from '../../auth/AuthContext';
import { Dialog } from '../../components/Dialog';
import { PasswordField } from '../../components/TextField';
import { errorMessage } from '../../lib/apiErrors';
import { passwordField } from '../auth/authSchemas';

const deleteAccountSchema = z.object({ password: passwordField });

/** Screen 15. Asks for the password; Cancel has focus first, as in every delete dialog. */
export function DeleteAccountDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} role="alertdialog" labelledBy="delete-account-title" describedBy="delete-account-text">
      <DeleteAccountForm onClose={onClose} />
    </Dialog>
  );
}

function whatIsDeleted(total) {
  if (total === undefined || total === 0) {
    return "Your account and its reminder history are deleted for good. This can't be undone.";
  }
  const subscriptions = total === 1 ? 'your 1 subscription' : `all ${total} subscriptions`;
  return `Your account, ${subscriptions} and their reminder history are deleted for good. This can't be undone.`;
}

function DeleteAccountForm({ onClose }) {
  const { endSessionLocally } = useAuth();
  const [formError, setFormError] = useState(null);
  const counts = useQuery({ queryKey: queryKeys.statusCounts({}), queryFn: () => getStatusCounts({}) });
  const total = counts.data && Object.values(counts.data).reduce((sum, count) => sum + count, 0);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(deleteAccountSchema), mode: 'onTouched', defaultValues: { password: '' } });

  async function onSubmit({ password }) {
    setFormError(null);
    try {
      await deleteAccount(password);
      // RequireAuth then opens Log in with "Your account was deleted."
      endSessionLocally('account-deleted');
    } catch (error) {
      if (error.code === 'WRONG_PASSWORD') {
        setError('password', { message: "That password isn't right." }, { shouldFocus: true });
      } else {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex items-start gap-3">
        <span className="grid size-[42px] shrink-0 place-items-center rounded-full bg-red-l text-red">
          <IconUserX size={21} aria-hidden="true" />
        </span>
        <div>
          <h3 id="delete-account-title" className="mt-0.5 mb-1.5 text-lg">
            Delete your account?
          </h3>
          <p id="delete-account-text" className="mb-[18px] text-sm text-muted">
            {whatIsDeleted(total)}
          </p>
        </div>
      </div>
      <PasswordField
        label="Type your password to confirm"
        icon={IconLock}
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      {formError && (
        <p className="field-error mb-3" role="alert">
          <IconAlertCircle size={16} aria-hidden="true" /> {formError}
        </p>
      )}
      <div className="flex justify-end gap-2.5">
        <button type="button" className="btn btn-line" data-autofocus onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          Delete account
        </button>
      </div>
    </form>
  );
}
