import { Link } from 'react-router';
import { Pill, ServiceTile } from '../../components/ServiceTile';
import { daysShortText, daysText, daysTone, formatDateShort, formatMoney, formatMoneyCompact } from '../../lib/format';

/**
 * "Next up" (screen 5): the next three renewals with date, payment label, amount and an
 * "in N days" pill. On the phone it is the "next renewals" card under the header, with
 * compact amounts and shorter pills.
 */
export function NextUp({ dashboard, onOpen, compact = false }) {
  const rows = dashboard.nextUp;
  return (
    <section className={`card ${compact ? 'px-3.5 py-1' : 'p-[22px]'}`} aria-labelledby="next-up-title">
      <div className={`flex items-center ${compact ? 'sr-only' : 'mb-1.5'}`}>
        <h2 id="next-up-title" className="flex-1 text-[17px]">
          {compact ? 'Next renewals' : 'Next up'}
        </h2>
        {!compact && (
          <Link to="/subscriptions" className="link text-sm">
            View all
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-muted">No renewals coming up.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={`${row.subscriptionId}-${row.date}`} className="border-t border-line first:border-t-0">
              <button type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => onOpen(row.subscriptionId)}>
                <ServiceTile name={row.name} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-semibold text-navy">{row.name}</b>
                  <span className="text-[13px] text-muted">
                    {formatDateShort(row.date)}
                    {!compact && row.paymentMethod && ` · ${row.paymentMethod}`}
                  </span>
                </span>
                <span className="text-right">
                  {compact ? (
                    <span className="amt block">
                      {/* The compact amount for the eye; the full amount for screen readers. */}
                      <span aria-hidden="true">{formatMoneyCompact(row.amount, dashboard.currency)}</span>
                      <span className="sr-only">{formatMoney(row.amount, dashboard.currency)}</span>
                    </span>
                  ) : (
                    <span className="amt block">{formatMoney(row.amount, dashboard.currency)}</span>
                  )}
                  <Pill tone={daysTone(row.daysUntil)}>{compact ? daysShortText(row.daysUntil) : daysText(row.daysUntil)}</Pill>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
