import { useAuth } from '../../auth/AuthContext';
import { formatMoney } from '../../lib/format';
import { todayIn, useCalendar, useDashboard } from './calendarQueries';

/**
 * Phone home header (screen 13): monthly spend and this week's strip, with a dot under each day
 * that has a renewal. A week can run into the next month, so both months' calendars are read.
 */
export function PhoneCalendarHeader() {
  const { user } = useAuth();
  const { data: dashboard } = useDashboard();

  const today = todayIn(user.timeZone).startOf('day');
  const weekStart = today.startOf('week'); // Monday
  const days = Array.from({ length: 7 }, (_, index) => weekStart.plus({ days: index }));
  const firstMonth = days[0].toFormat('yyyy-MM');
  const lastMonth = days[6].toFormat('yyyy-MM');
  const first = useCalendar(firstMonth);
  const last = useCalendar(lastMonth, { enabled: lastMonth !== firstMonth });

  const renewalDates = new Set(
    [...(first.data?.renewals ?? []), ...(lastMonth !== firstMonth ? (last.data?.renewals ?? []) : [])].map(
      (renewal) => renewal.date,
    ),
  );

  return (
    <div className="px-4 pt-3 pb-2">
      <div className="text-xs font-semibold text-band-muted">Monthly spend</div>
      <div className="font-display text-[32px] font-semibold tabular-nums">
        {dashboard ? formatMoney(dashboard.monthlySpend, dashboard.currency) : '—'}
      </div>
      <ol className="mt-3.5 grid grid-cols-7 gap-1 text-center" aria-label="This week">
        {days.map((day) => {
          const iso = day.toISODate();
          const isToday = day.equals(today);
          const hasRenewal = renewalDates.has(iso);
          return (
            <li
              key={iso}
              className={`rounded-xl py-1.5 text-[11px] font-semibold text-band-text ${isToday ? 'bg-white/16' : ''}`}
              aria-current={isToday ? 'date' : undefined}
            >
              <span aria-hidden="true">{day.setLocale('en-US').toFormat('ccccc')}</span>
              <b className="block font-display text-base font-semibold text-white" aria-hidden="true">
                {day.day}
              </b>
              <span className={`mx-auto mt-[3px] block size-[5px] rounded-full ${hasRenewal ? 'bg-white' : ''}`} aria-hidden="true" />
              <span className="sr-only">
                {day.setLocale('en-US').toFormat('cccc d LLLL')}
                {isToday ? ', today' : ''}
                {hasRenewal ? ', has a renewal' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
