import { IconArrowDown, IconArrowUp, IconChevronDown, IconFilter, IconPlus, IconSearch } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { queryKeys } from '../../api/queryKeys';
import { getStatusCounts, listSubscriptions } from '../../api/subscriptions';
import { useAuth } from '../../auth/AuthContext';
import { Pager } from '../../components/Pager';
import { Pill, ServiceTile } from '../../components/ServiceTile';
import { EmptyPanel, ErrorPanel, SkeletonRows } from '../../components/StatePanels';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDrawer } from '../../layout/DrawerContext';
import { CATEGORIES, categoryLabel, cycleLabel, STATUSES, statusLabel, statusTone } from '../../lib/enums';
import { daysText, formatDate, formatInstantDate, formatMoney, formatMonthShort } from '../../lib/format';
import { ConfirmStatusDialog } from './ConfirmDialogs';
import { RowMenu } from './RowMenu';
import { useStatusActions } from './useStatusActions';

const PAGE_SIZE = 20;

const EMPTY_TEXT = {
  PAUSED: 'Nothing paused.',
  CANCELLED: 'Nothing cancelled.',
  ARCHIVED: 'Nothing archived.',
};

/**
 * Screen 6: search, status tabs with counts, category filter, sortable columns and pages of 20.
 * The tab, category, sort and page live in the URL, so a reload keeps them. Paused, cancelled
 * and archived subscriptions have no next renewal, so their tabs show "Since" (when the status
 * changed), newest first. Also rendered for /subscriptions/:id, with the drawer open on top.
 */
export function SubscriptionsPage() {
  const { user } = useAuth();
  const { openAdd, openView, openEdit } = useDrawer();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText.trim(), 300);
  const statusActions = useStatusActions();
  const [confirm, setConfirm] = useState(null); // { action, subscription }

  const statusParam = searchParams.get('status');
  const status = STATUSES.some((item) => item.value === statusParam) ? statusParam : 'ACTIVE';
  const isActiveTab = status === 'ACTIVE';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? (isActiveTab ? 'nextRenewalDate' : '-statusChangedAt');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  function updateParams(changes) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null || value === '') next.delete(key);
          else next.set(key, String(value));
        });
        return next;
      },
      { replace: true },
    );
  }

  const listParams = { q: search || undefined, status, category: category || undefined, page, size: PAGE_SIZE, sort };
  const list = useQuery({
    queryKey: queryKeys.subscriptionList(listParams),
    queryFn: () => listSubscriptions(listParams),
    placeholderData: keepPreviousData,
  });
  const countParams = { q: search || undefined, category: category || undefined };
  const counts = useQuery({
    queryKey: queryKeys.statusCounts(countParams),
    queryFn: () => getStatusCounts(countParams),
    placeholderData: keepPreviousData,
  });

  // A page that no longer exists (its last row was deleted or moved): go to the last page.
  const totalPages = list.data?.totalPages;
  useEffect(() => {
    if (totalPages !== undefined && page > Math.max(1, totalPages)) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (totalPages > 1) next.set('page', String(totalPages));
          else next.delete('page');
          return next;
        },
        { replace: true },
      );
    }
  }, [totalPages, page, setSearchParams]);

  function onAction(subscription, action) {
    if (action === 'edit') {
      openEdit(subscription.id);
    } else if (action === 'pause' || action === 'delete') {
      setConfirm({ action, subscription });
    } else {
      statusActions.run(subscription, action);
    }
  }

  function toggleSort(field) {
    const descending = sort === field;
    updateParams({ sort: descending ? `-${field}` : field, page: null });
  }

  const dateField = isActiveTab ? 'nextRenewalDate' : 'statusChangedAt';

  return (
    <section className="card overflow-hidden" aria-label="Subscriptions">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-3.5 py-3.5 tab:px-5 tab:py-[18px]">
        <div className="input-wrap min-w-[220px] flex-1">
          <IconSearch size={18} className="input-icon" aria-hidden="true" />
          <input
            className="input"
            type="search"
            aria-label="Search subscriptions"
            placeholder="Search by name"
            maxLength={80}
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              updateParams({ page: null });
            }}
          />
        </div>
        <div className="seg" role="group" aria-label="Status">
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={status === item.value}
              onClick={() => updateParams({ status: item.value === 'ACTIVE' ? null : item.value, sort: null, page: null })}
            >
              {item.label} {counts.data?.[item.value] ?? ''}
            </button>
          ))}
        </div>
        <div className="input-wrap">
          <IconFilter size={18} className="input-icon text-navy" aria-hidden="true" />
          <label htmlFor="category-filter" className="sr-only">
            Category
          </label>
          <select
            id="category-filter"
            className="btn btn-line appearance-none pr-9 pl-10"
            value={category}
            onChange={(event) => updateParams({ category: event.target.value, page: null })}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <IconChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" aria-hidden="true" />
        </div>
      </div>

      {list.isPending ? (
        <SkeletonRows rows={4} label="Loading your subscriptions…" />
      ) : list.isError ? (
        <ErrorPanel className="m-5" onRetry={() => list.refetch()} />
      ) : list.data.totalItems === 0 ? (
        <EmptyState
          status={status}
          search={search}
          category={category}
          onClearSearch={() => setSearchText('')}
          onAdd={openAdd}
        />
      ) : (
        <>
          {/* relative: the header's sr-only "Actions" label is absolutely positioned, so without it
              the label would escape this scroll box and make the whole page wider on phones. */}
          <div className="relative overflow-x-auto">
            <table className={`w-full min-w-[620px] border-collapse text-sm ${list.isPlaceholderData ? 'opacity-60' : ''}`}>
              <thead>
                <tr>
                  <SortHeader label="Subscription" field="name" sort={sort} onSort={toggleSort} />
                  <th className="th hidden tab:table-cell">Category</th>
                  <th className="th">Billing</th>
                  <SortHeader label={isActiveTab ? 'Next renewal' : 'Since'} field={dateField} sort={sort} onSort={toggleSort} />
                  <SortHeader label="Amount" field="amount" sort={sort} onSort={toggleSort} alignRight />
                  <th className="th">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((subscription) => (
                  <tr key={subscription.id} className="border-b border-line last:border-b-0">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <ServiceTile name={subscription.name} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="block max-w-[220px] truncate text-left font-semibold text-navy hover:text-brand"
                            onClick={() => openView(subscription.id)}
                          >
                            {subscription.name}
                          </button>
                          {subscription.paymentMethod && (
                            <span className="text-xs text-muted">Paid with {subscription.paymentMethod}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="td hidden tab:table-cell">
                      <Pill tone="blue">{categoryLabel(subscription.category)}</Pill>
                    </td>
                    <td className="td">{cycleLabel(subscription.billingCycle)}</td>
                    <td className="td whitespace-nowrap">
                      {isActiveTab ? (
                        <>
                          <b className="font-semibold text-navy">{formatDate(subscription.nextRenewalDate)}</b>
                          {subscription.monthEndAdjusted ? (
                            <div className="text-xs text-amber">last day of {formatMonthShort(subscription.nextRenewalDate)}</div>
                          ) : (
                            <div className="text-xs text-muted">{daysText(subscription.daysUntilRenewal)}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <b className="font-semibold text-navy">{formatInstantDate(subscription.statusChangedAt, user.timeZone)}</b>
                          <div className="mt-[3px]">
                            <Pill tone={statusTone(subscription.status)}>{statusLabel(subscription.status)}</Pill>
                          </div>
                        </>
                      )}
                    </td>
                    <td className="td amt text-right">{formatMoney(subscription.amount, subscription.currency)}</td>
                    <td className="td w-[60px]">
                      <RowMenu
                        subscription={subscription}
                        busy={statusActions.pending?.id === subscription.id}
                        onAction={onAction}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={list.data.page}
            size={list.data.size}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onPage={(number) => updateParams({ page: number > 1 ? number : null })}
            suffix={search ? ` for “${search}”` : ''}
          />
        </>
      )}

      <ConfirmStatusDialog
        action={confirm?.action}
        subscription={confirm?.subscription}
        onConfirm={() => statusActions.run(confirm.subscription, confirm.action)}
        onClose={() => setConfirm(null)}
      />
    </section>
  );
}

function SortHeader({ label, field, sort, onSort, alignRight = false }) {
  const ascending = sort === field;
  const descending = sort === `-${field}`;
  const sorted = ascending || descending;
  return (
    <th className={`th ${alignRight ? 'text-right' : ''}`} aria-sort={ascending ? 'ascending' : descending ? 'descending' : 'none'}>
      <button
        type="button"
        className={`inline-flex items-center gap-1 uppercase ${sorted ? 'text-brand-d' : ''}`}
        onClick={() => onSort(field)}
      >
        {label}
        {ascending && <IconArrowUp size={14} aria-hidden="true" />}
        {descending && <IconArrowDown size={14} aria-hidden="true" />}
      </button>
    </th>
  );
}

function EmptyState({ status, search, category, onClearSearch, onAdd }) {
  if (search) {
    return (
      <p className="px-5 py-10 text-center text-muted">
        Nothing matches “{search}”.{' '}
        <button type="button" className="link" onClick={onClearSearch}>
          Clear the search.
        </button>
      </p>
    );
  }
  if (status === 'ACTIVE' && !category) {
    return (
      <EmptyPanel
        title="No subscriptions yet"
        action={
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            <IconPlus size={18} aria-hidden="true" /> Add subscription
          </button>
        }
      />
    );
  }
  const text = EMPTY_TEXT[status] ?? `Nothing in ${categoryLabel(category)}.`;
  return <p className="px-5 py-10 text-center text-muted">{text}</p>;
}
