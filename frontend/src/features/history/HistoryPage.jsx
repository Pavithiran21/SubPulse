import { IconLoader2, IconPlayerPlay, IconRestore } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '../../api/queryKeys';
import { listSubscriptions } from '../../api/subscriptions';
import { useAuth } from '../../auth/AuthContext';
import { Pager } from '../../components/Pager';
import { Pill, ServiceTile } from '../../components/ServiceTile';
import { ErrorPanel, SkeletonRows } from '../../components/StatePanels';
import { useDrawer } from '../../layout/DrawerContext';
import { statusLabel, statusTone } from '../../lib/enums';
import { formatInstantDate } from '../../lib/format';
import { useStatusActions } from '../subscriptions/useStatusActions';

const PAGE_SIZE = 20;

// "Cancelled 2 Oct 2026", "Paused since 15 Sep 2026", "Archived 20 Aug 2026".
const DATE_PREFIX = { PAUSED: 'Paused since', CANCELLED: 'Cancelled', ARCHIVED: 'Archived' };

/**
 * Screen 8: paused, cancelled and archived subscriptions, newest change first. Each row has one
 * button: Resume on a paused one, Restore on a cancelled or archived one (the only changes the
 * backend allows from those statuses).
 */
export function HistoryPage() {
  const { user } = useAuth();
  const { openView } = useDrawer();
  const [page, setPage] = useState(1);
  const statusActions = useStatusActions();

  const params = { status: 'PAUSED,CANCELLED,ARCHIVED', sort: '-statusChangedAt', page, size: PAGE_SIZE };
  const history = useQuery({
    queryKey: queryKeys.subscriptionList(params),
    queryFn: () => listSubscriptions(params),
    placeholderData: keepPreviousData,
  });

  // The last row of a later page was resumed or restored: show the last page that still exists.
  const lastPage = Math.max(1, history.data?.totalPages ?? 1);
  if (history.data && page > lastPage) {
    setPage(lastPage);
  }

  let body;
  if (history.isPending) {
    body = <SkeletonRows rows={3} label="Loading your history…" />;
  } else if (history.isError) {
    body = <ErrorPanel className="m-5" onRetry={() => history.refetch()} />;
  } else if (history.data.totalItems === 0) {
    body = <p className="px-5 py-10 text-center text-muted">Nothing paused or cancelled yet.</p>;
  } else {
    body = (
      <>
        <ul className="px-[22px] pt-2">
          {history.data.items.map((subscription) => {
            const isPaused = subscription.status === 'PAUSED';
            const action = isPaused ? 'resume' : 'restore';
            const busy = statusActions.pending?.id === subscription.id;
            const ActionIcon = isPaused ? IconPlayerPlay : IconRestore;
            return (
              <li key={subscription.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                <ServiceTile name={subscription.name} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block max-w-full truncate text-left font-semibold text-navy hover:text-brand"
                    onClick={() => openView(subscription.id)}
                  >
                    {subscription.name}
                  </button>
                  <span className="text-[13px] text-muted">
                    {DATE_PREFIX[subscription.status]} {formatInstantDate(subscription.statusChangedAt, user.timeZone)}
                  </span>
                </div>
                {/* Hidden on the phone: the date line already names the status. */}
                <Pill tone={statusTone(subscription.status)} className="hidden tab:inline-flex">
                  {statusLabel(subscription.status)}
                </Pill>
                <button
                  type="button"
                  className="btn btn-line btn-sm"
                  aria-label={`${isPaused ? 'Resume' : 'Restore'} ${subscription.name}`}
                  disabled={busy}
                  onClick={() => statusActions.run(subscription, action)}
                >
                  {busy ? (
                    <IconLoader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
                  ) : (
                    <ActionIcon size={16} aria-hidden="true" />
                  )}{' '}
                  {isPaused ? 'Resume' : 'Restore'}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hint px-[22px]">
          Newest change first. Resume or Restore makes it active again, with its next renewal on or after today.
        </p>
        <Pager
          page={history.data.page}
          size={history.data.size}
          totalItems={history.data.totalItems}
          totalPages={history.data.totalPages}
          onPage={setPage}
        />
      </>
    );
  }

  return (
    <section className="card overflow-hidden" aria-label="History">
      {body}
    </section>
  );
}
