import { IconListDetails, IconSearchOff } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { queryKeys } from '../../api/queryKeys';
import { getSubscription } from '../../api/subscriptions';
import { Dialog } from '../../components/Dialog';
import { ErrorPanel } from '../../components/StatePanels';
import { DrawerHeader } from './DrawerHeader';
import { SubscriptionForm } from './SubscriptionForm';
import { SubscriptionView } from './SubscriptionView';

/**
 * The side drawer (screen 7), on the same native <dialog> as the other dialogs, so focus stays
 * inside it, Esc closes it and focus returns to what opened it. Phone: a full-screen sheet (index.css).
 * mode: "add" (the empty form), "view" (one subscription, read only, with Edit) or "edit" (its form).
 */
export function SubscriptionDrawer({ mode, subscriptionId, onClose }) {
  return (
    <Dialog open onClose={onClose} variant="drawer" labelledBy="drawer-title">
      {mode === 'add' ? (
        <SubscriptionForm onClose={onClose} />
      ) : (
        <LoadedSubscription id={subscriptionId} startEditing={mode === 'edit'} onClose={onClose} />
      )}
    </Dialog>
  );
}

/**
 * Loads the subscription, then shows the view or the form. Edit in the view switches to the form
 * in the same drawer, and the form's Cancel goes back to the view if the drawer opened as one.
 * The form is keyed by version: after Reload (a 409) or a Resume from the drawer, the newest values
 * replace the form's. The query is never refetched in the background while the drawer is open, so a
 * change made in another tab shows up as the 409 banner on Save instead of silently replacing what
 * the user typed.
 */
function LoadedSubscription({ id, startEditing, onClose }) {
  const [editing, setEditing] = useState(startEditing);
  const query = useQuery({
    queryKey: queryKeys.subscription(id),
    queryFn: () => getSubscription(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const title = editing ? 'Edit subscription' : 'Subscription';

  if (query.isPending) {
    return <DrawerSkeleton title={title} onClose={onClose} />;
  }
  if (query.isError) {
    // A 404 is also what another user's subscription gives; a bad id in the link gives 400.
    if (query.error.status === 404 || query.error.status === 400) {
      return <NotFound onClose={onClose} />;
    }
    return (
      <>
        <DrawerHeader title={title} onClose={onClose} />
        <ErrorPanel title="Couldn't load this subscription" onRetry={() => query.refetch()} />
      </>
    );
  }
  if (!editing) {
    return <SubscriptionView subscription={query.data} onEdit={() => setEditing(true)} onClose={onClose} />;
  }
  return (
    <SubscriptionForm
      key={query.data.version}
      subscription={query.data}
      onReload={() => query.refetch()}
      onClose={onClose}
      onCancel={startEditing ? onClose : () => setEditing(false)}
    />
  );
}

function DrawerSkeleton({ title, onClose }) {
  return (
    <div aria-busy="true">
      <DrawerHeader title={title} onClose={onClose} />
      <p className="sr-only">Loading the subscription…</p>
      {[40, 100, 70, 100, 55, 85].map((width, index) => (
        <div key={index} className="skel" style={{ width: `${width}%`, height: index % 2 ? 40 : 12 }} />
      ))}
    </div>
  );
}

/** Screen 17: "View subscription" for one that was deleted, or isn't this user's. */
function NotFound({ onClose }) {
  const navigate = useNavigate();
  return (
    <>
      <DrawerHeader title="Subscription" onClose={onClose} />
      <div className="card p-[22px] text-center">
        <span className="mx-auto grid size-[52px] place-items-center rounded-full bg-mist text-muted">
          <IconSearchOff size={26} aria-hidden="true" />
        </span>
        <h3 className="mt-2.5 mb-1 text-lg">We couldn't find that subscription</h3>
        <p className="mb-3.5 text-sm text-muted">It may have been deleted.</p>
        <button
          type="button"
          className="btn btn-line"
          onClick={() => {
            onClose();
            navigate('/subscriptions');
          }}
        >
          <IconListDetails size={18} aria-hidden="true" /> Go to subscriptions
        </button>
      </div>
    </>
  );
}
