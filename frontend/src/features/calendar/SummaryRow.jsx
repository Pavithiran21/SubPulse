import { formatMoney } from '../../lib/format';
import { useDashboard } from './calendarQueries';

/**
 * The spend summary in the band (screen 5): monthly, yearly, due in 30 days with its count, and
 * saved per month (the monthly cost of cancelled subscriptions). Every total comes from the API.
 */
export function SummaryRow() {
  const { data } = useDashboard();
  const money = (amount) => (data ? formatMoney(amount, data.currency) : '—');

  return (
    <dl className="flex flex-wrap items-end gap-x-7 gap-y-3 px-[26px] pt-1.5 pb-2" aria-busy={!data}>
      <SummaryItem label="Monthly spend" value={data && money(data.monthlySpend)} big />
      <div className="hidden h-[46px] w-px bg-white/25 desk:block" aria-hidden="true" />
      <SummaryItem label="Yearly" value={data && money(data.yearlySpend)} />
      <SummaryItem
        label="Due in 30 days"
        value={
          data && (
            <>
              {money(data.dueIn30Days.total)}{' '}
              <span className="pill bg-white/18 align-middle text-white">
                {data.dueIn30Days.count} {data.dueIn30Days.count === 1 ? 'renewal' : 'renewals'}
              </span>
            </>
          )
        }
      />
      <SummaryItem label="Saved per month" value={data && money(data.savedPerMonth)} />
    </dl>
  );
}

function SummaryItem({ label, value, big = false }) {
  return (
    <div>
      <dt className="mb-1.5 text-[13px] font-semibold text-band-muted">{label}</dt>
      <dd
        className={`font-display font-semibold tabular-nums ${
          big ? 'text-[36px] leading-none tracking-[-.02em] desk:text-[44px]' : 'text-[22px]'
        }`}
      >
        {value ?? <span className="inline-block h-6 w-28 rounded-md bg-white/15 align-middle" />}
      </dd>
    </div>
  );
}
