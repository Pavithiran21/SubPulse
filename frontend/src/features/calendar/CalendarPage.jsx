import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { EmptyPanel, ErrorPanel, LoadingCard } from '../../components/StatePanels';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useDrawer } from '../../layout/DrawerContext';
import { formatMonth } from '../../lib/format';
import { currentMonth, useCalendar, useDashboard } from './calendarQueries';
import { CategoryBars } from './CategoryBars';
import { MonthGrid } from './MonthGrid';
import { MonthList } from './MonthList';
import { NextUp } from './NextUp';

function shiftMonth(month, by) {
  return DateTime.fromISO(`${month}-01`, { zone: 'utc' }).plus({ months: by }).toFormat('yyyy-MM');
}

/**
 * Home (screen 5): the month calendar with Month/List views, and a right column with Next up
 * and spend by category. The totals above it are in the band (SummaryRow).
 * Phone (screen 13): the next renewals card first, then the month with amount-only chips.
 */
export function CalendarPage() {
  const { user } = useAuth();
  const { openAdd, openView } = useDrawer();
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [month, setMonth] = useState(() => currentMonth(user.timeZone));
  const [view, setView] = useState('month');
  const dashboard = useDashboard();
  const calendar = useCalendar(month);

  if (dashboard.isPending || (calendar.isPending && !calendar.data)) {
    return <LoadingCard label="Loading your calendar…" />;
  }
  if (dashboard.isError || calendar.isError) {
    return (
      <ErrorPanel
        onRetry={() => {
          dashboard.refetch();
          calendar.refetch();
        }}
      />
    );
  }

  // No active subscription at all: the empty calendar (paused or cancelled ones are in History).
  if (dashboard.data.activeCount === 0) {
    return (
      <section className="card">
        <EmptyPanel
          title="Your calendar is empty"
          text="Add a subscription and its renewals appear here."
          action={
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <IconPlus size={18} aria-hidden="true" /> Add subscription
            </button>
          }
        />
      </section>
    );
  }

  const calendarCard = (
    <section className="card overflow-hidden" aria-labelledby="calendar-title">
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3.5 tab:px-5 tab:py-[18px]">
        <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
          <IconChevronLeft size={19} aria-hidden="true" />
        </button>
        <h2 id="calendar-title" className="flex-1 text-lg" aria-live="polite">
          {formatMonth(month)}
        </h2>
        {!isPhone && (
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'month'} onClick={() => setView('month')}>
              Month
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              List
            </button>
          </div>
        )}
        <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
          <IconChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
      <div className={calendar.isFetching && calendar.isPlaceholderData ? 'opacity-60' : ''}>
        {view === 'list' && !isPhone ? (
          <MonthList month={month} calendar={calendar.data} onOpen={openView} />
        ) : (
          <MonthGrid month={month} calendar={calendar.data} isPhone={isPhone} onOpen={openView} />
        )}
      </div>
    </section>
  );

  if (isPhone) {
    return (
      <div className="flex flex-col gap-3.5">
        <NextUp dashboard={dashboard.data} onOpen={openView} compact />
        {calendarCard}
        <CategoryBars dashboard={dashboard.data} />
      </div>
    );
  }

  return (
    <div className="grid items-start gap-[18px] desk:grid-cols-[1fr_340px]">
      {calendarCard}
      <div className="flex flex-col gap-[18px]">
        <NextUp dashboard={dashboard.data} onOpen={openView} />
        <CategoryBars dashboard={dashboard.data} />
      </div>
    </div>
  );
}
