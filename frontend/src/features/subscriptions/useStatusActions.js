import { IconArchive, IconCircleCheck, IconPlayerPause, IconRestore, IconTrash } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { changeStatus, deleteSubscription } from '../../api/subscriptions';
import { errorMessage } from '../../lib/apiErrors';
import { useToast } from '../../toast/ToastContext';
import { refreshSubscriptionData } from './subscriptionCache';

const GREEN = 'text-[#6ee7b7]';
const YELLOW = 'text-[#fcd34d]';

// The success toasts from UI-UX.md "Toasts".
function successToast(action, name) {
  switch (action) {
    case 'pause':
      return { message: `${name} paused`, icon: IconPlayerPause, iconClass: YELLOW };
    case 'resume':
      return { message: `${name} resumed`, icon: IconCircleCheck, iconClass: GREEN };
    case 'cancel':
      return { message: 'Marked cancelled', icon: IconCircleCheck, iconClass: GREEN };
    case 'archive':
      return { message: `${name} archived`, icon: IconArchive, iconClass: GREEN };
    case 'restore':
      return { message: 'Restored to active', icon: IconRestore, iconClass: GREEN };
    default:
      return { message: `${name} deleted`, icon: IconTrash, iconClass: GREEN };
  }
}

/**
 * Pause, resume, cancel, archive, restore and delete, with their toasts. Only Pause gets Undo,
 * because Resume is its exact inverse (Restore always goes back to Active, so it can't undo a
 * cancel or archive of a paused subscription). A 422 (another tab changed the status first)
 * shows the API's message as an error toast. Either way the lists are fetched again.
 *
 * pending is { id, action } while a change is on its way, so its button can show a spinner.
 */
export function useStatusActions() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState(null);

  async function run(subscription, action) {
    setPending({ id: subscription.id, action });
    try {
      if (action === 'delete') {
        await deleteSubscription(subscription.id);
      } else {
        await changeStatus(subscription.id, action);
      }
      const shown = successToast(action, subscription.name);
      toast.success(shown.message, {
        icon: shown.icon,
        iconClass: shown.iconClass,
        action: action === 'pause' ? { label: 'Undo', onClick: () => run(subscription, 'resume') } : undefined,
      });
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setPending(null);
      await refreshSubscriptionData(queryClient);
    }
  }

  return { run, pending };
}
