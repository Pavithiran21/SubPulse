import { ServiceTile } from '../../components/ServiceTile';
import { formatDate, formatMoney, formatMonth, formatMonthShort } from '../../lib/format';

/** The calendar's List view: the month's renewals as rows, oldest first. */
export function MonthList({ month, calendar, onOpen }) {
  if (calendar.renewals.length === 0) {
    return <p className="px-5 py-10 text-center text-muted">No renewals in {formatMonth(month)}.</p>;
  }
  return (
    <ul>
      {calendar.renewals.map((renewal) => (
        <li key={`${renewal.subscriptionId}-${renewal.date}`} className={`border-b border-line last:border-b-0 ${renewal.past ? 'opacity-55' : ''}`}>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-subtle"
            onClick={() => onOpen(renewal.subscriptionId)}
          >
            <ServiceTile name={renewal.name} />
            <span className="min-w-0 flex-1">
              <b className="block truncate font-semibold text-navy">{renewal.name}</b>
              <span className="text-[13px] text-muted">
                {formatDate(renewal.date)}
                {renewal.past && ' · past'}
              </span>
              {renewal.monthEndAdjusted && (
                <span className="block text-xs text-amber">last day of {formatMonthShort(renewal.date)}</span>
              )}
            </span>
            <span className="amt">{formatMoney(renewal.amount, calendar.currency)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
