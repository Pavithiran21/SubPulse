import { DateTime } from 'luxon';
import { useEffect, useRef, useState } from 'react';
import { formatAmountCompact, formatMoney, formatMoneyCompact, formatMonth } from '../../lib/format';
import { serviceColor } from '../../lib/serviceColor';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

/** Every day shown for a month: from the Monday on or before the 1st to the Sunday on or after the last day. */
function gridDays(month) {
  const first = DateTime.fromISO(`${month}-01`, { zone: 'utc' });
  const start = first.startOf('week');
  const end = first.endOf('month').endOf('week').startOf('day');
  const days = [];
  for (let day = start; day <= end; day = day.plus({ days: 1 })) {
    days.push(day);
  }
  return days;
}

/**
 * The month grid (screen 5): renewal chips in the service's colour on their day, past days
 * faded, today highlighted, and days with a renewal due within 3 days tinted red.
 *
 * Keyboard (UI-UX.md): the grid is a single Tab stop. Arrow keys move between days, Home and
 * End go to the start and end of the week, and Tab moves into the chosen day's chips.
 */
export function MonthGrid({ month, calendar, isPhone, onOpen }) {
  const days = gridDays(month);
  const isoDays = days.map((day) => day.toISODate());
  const [activeDate, setActiveDate] = useState(null);
  const gridRef = useRef(null);
  const movedByKey = useRef(false);

  const today = calendar.today;
  const inMonth = (iso) => iso.startsWith(month);
  const fallback = inMonth(today) ? today : `${month}-01`;
  const active = activeDate && isoDays.includes(activeDate) ? activeDate : fallback;

  const renewalsByDate = new Map();
  calendar.renewals.forEach((renewal) => {
    renewalsByDate.set(renewal.date, [...(renewalsByDate.get(renewal.date) ?? []), renewal]);
  });
  const todayDate = DateTime.fromISO(today, { zone: 'utc' });

  // After an arrow key, move focus to the new day.
  useEffect(() => {
    if (movedByKey.current) {
      movedByKey.current = false;
      gridRef.current?.querySelector(`[data-date="${active}"]`)?.focus();
    }
  }, [active]);

  function onKeyDown(event) {
    if (event.target.getAttribute('role') !== 'gridcell') {
      return;
    }
    const index = isoDays.indexOf(active);
    let next;
    if (event.key in KEY_STEPS) {
      next = index + KEY_STEPS[event.key];
    } else if (event.key === 'Home') {
      next = index - (index % 7);
    } else if (event.key === 'End') {
      next = index - (index % 7) + 6;
    } else {
      return;
    }
    event.preventDefault();
    if (next >= 0 && next < isoDays.length) {
      movedByKey.current = true;
      setActiveDate(isoDays[next]);
    }
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div ref={gridRef} role="grid" aria-label={`${formatMonth(month)} renewals`} onKeyDown={onKeyDown}>
      <div role="row" className="grid grid-cols-7">
        {WEEKDAYS.map((name) => (
          <div
            key={name}
            role="columnheader"
            className="border-b border-line px-1.5 py-2.5 text-[11px] font-semibold tracking-[.06em] text-muted uppercase tab:px-3 tab:text-xs"
          >
            {name}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div role="row" key={week[0].toISODate()} className="grid grid-cols-7">
          {week.map((day, column) => {
            const iso = day.toISODate();
            const renewals = inMonth(iso) ? (renewalsByDate.get(iso) ?? []) : [];
            const isPast = iso < today;
            const isToday = iso === today;
            const daysAway = day.diff(todayDate, 'days').days;
            const dueSoon = renewals.length > 0 && daysAway >= 0 && daysAway <= 3;
            const isActive = iso === active;
            return (
              <div
                key={iso}
                role="gridcell"
                data-date={iso}
                tabIndex={isActive ? 0 : -1}
                aria-current={isToday ? 'date' : undefined}
                onFocus={() => setActiveDate(iso)}
                className={`min-h-16 min-w-0 border-b border-line p-[3px] text-[13px] tab:min-h-[92px] tab:p-2 ${
                  column < 6 ? 'border-r' : ''
                } ${dueSoon ? 'bg-red-l' : isPast ? 'bg-subtle' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block font-semibold ${
                    isToday ? 'rounded-lg bg-brand px-[7px] py-px text-white' : inMonth(iso) ? 'text-navy' : 'text-[#b6bfd3]'
                  }`}
                >
                  {day.day}
                </span>
                <span className="sr-only">
                  {day.setLocale('en-US').toFormat('cccc d LLLL')}
                  {isToday ? ', today' : ''}
                  {renewals.length === 0 ? ', no renewals' : ''}
                </span>
                {renewals.map((renewal) => (
                  <RenewalChip
                    key={renewal.subscriptionId}
                    renewal={renewal}
                    currency={calendar.currency}
                    isPhone={isPhone}
                    tabbable={isActive}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * A renewal on its day. On phones a day is only about 49 px wide, so the chip shows just the
 * amount, without the currency symbol and in smaller type ("349.50"). A very large amount that
 * still doesn't fit ends in "…" rather than a cut-off digit that could be misread. The full
 * amount, with the symbol, is always in the label and in the drawer.
 */
function RenewalChip({ renewal, currency, isPhone, tabbable, onOpen }) {
  const compact = isPhone ? formatAmountCompact(renewal.amount, currency) : formatMoneyCompact(renewal.amount, currency);
  const label = `${renewal.name}, ${formatMoney(renewal.amount, currency)}${renewal.past ? ', past renewal' : ''}`;
  return (
    <button
      type="button"
      tabIndex={tabbable ? 0 : -1}
      aria-label={label}
      onClick={() => onOpen(renewal.subscriptionId)}
      className={`mt-[5px] flex w-full items-center gap-[5px] overflow-hidden rounded-[7px] py-[3px] text-left font-semibold whitespace-nowrap text-white ${
        isPhone ? 'px-[3px] text-[10px] tabular-nums' : 'px-1.5 text-xs'
      } ${renewal.past ? 'opacity-45' : ''}`}
      style={{ background: serviceColor(renewal.name) }}
    >
      {!isPhone && <span className="min-w-0 truncate">{renewal.name}</span>}
      <span className={`opacity-85 ${isPhone ? 'min-w-0 truncate' : 'ml-auto'}`}>{compact}</span>
    </button>
  );
}
