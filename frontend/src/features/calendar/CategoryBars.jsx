import { categoryLabel } from '../../lib/enums';
import { formatMoney, toCents } from '../../lib/format';

// The bars fade a little for each lower rank, as in the design.
const OPACITIES = [1, 0.8, 0.65, 0.5, 0.35];

/**
 * "Monthly spend by category". The amounts come from the API; only each bar's width is
 * worked out here, from whole cents, as its share of the monthly spend.
 */
export function CategoryBars({ dashboard }) {
  const total = toCents(dashboard.monthlySpend);
  const rows = dashboard.byCategory
    .filter((row) => toCents(row.monthlySpend) > 0)
    .sort((a, b) => toCents(b.monthlySpend) - toCents(a.monthlySpend));

  return (
    <section className="card p-[22px]" aria-labelledby="by-category-title">
      <h2 id="by-category-title" className="mb-3.5 text-[17px]">
        Monthly spend by category
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing active yet.</p>
      ) : (
        <ul>
          {rows.map((row, index) => {
            const share = total > 0 ? Math.round((toCents(row.monthlySpend) / total) * 100) : 0;
            return (
              <li key={row.category} className="mb-3 grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 text-sm last:mb-0">
                <span>{categoryLabel(row.category)}</span>
                <b className="amt">{formatMoney(row.monthlySpend, dashboard.currency)}</b>
                <span className="col-span-2 block h-2 overflow-hidden rounded-lg bg-canvas" aria-hidden="true">
                  <span
                    className="block h-full rounded-lg bg-brand"
                    style={{ width: `${Math.max(share, 1)}%`, opacity: OPACITIES[Math.min(index, OPACITIES.length - 1)] }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
