import { IconLoader2, IconPlayerPause, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { Dialog } from '../../components/Dialog';

/**
 * Screens 10 and 11: Pause and Delete ask first. Delete focuses Cancel first and suggests
 * marking it cancelled instead. onConfirm returns a promise; the dialog closes when it settles.
 */
export function ConfirmStatusDialog({ action, subscription, onConfirm, onClose }) {
  const isDelete = action === 'delete';
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    await onConfirm();
    setBusy(false);
    onClose();
  }

  return (
    <Dialog open={Boolean(subscription)} onClose={onClose} role="alertdialog" labelledBy="confirm-title" describedBy="confirm-text">
      {subscription && (
        <>
          <div className="flex items-start gap-3">
            <span
              className={`grid size-[42px] shrink-0 place-items-center rounded-full ${
                isDelete ? 'bg-red-l text-red' : 'bg-amber-l text-amber'
              }`}
            >
              {isDelete ? <IconTrash size={21} aria-hidden="true" /> : <IconPlayerPause size={21} aria-hidden="true" />}
            </span>
            <div>
              <h3 id="confirm-title" className="mt-0.5 mb-1.5 text-lg">
                {isDelete ? `Delete ${subscription.name}?` : `Pause ${subscription.name}?`}
              </h3>
              <p id="confirm-text" className="mb-[18px] text-sm text-muted">
                {isDelete
                  ? "It's removed from totals and history, and reminders stop. To keep a record, mark it cancelled instead."
                  : 'No reminders while paused, and it stops counting in monthly spend. Resume any time from History.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn btn-line" data-autofocus={isDelete ? true : undefined} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${isDelete ? 'btn-danger' : 'btn-primary'}`}
              disabled={busy}
              data-autofocus={isDelete ? undefined : true}
              onClick={confirm}
            >
              {busy && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
              {isDelete ? 'Delete' : 'Pause'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
