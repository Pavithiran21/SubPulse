import { IconBellOff, IconBellRinging, IconCalendarRepeat, IconClockPause } from '@tabler/icons-react';
import { Pill } from '../../components/ServiceTile';
import { REMINDER_CHIPS } from '../../lib/enums';
import {
  formatDate,
  formatDateShort,
  formatDayMonth,
  formatMoney,
  formatMonthShort,
  formatSendTime,
  joinWithAnd,
} from '../../lib/format';

/**
 * Under the drawer's fields (screen 7): the next four renewal dates, with month-end adjusted
 * dates in amber ("month has 30 days", "February"), then when the reminders go out.
 * Everything here comes from GET /renewals/preview.
 */
export function RenewalPreview({ preview, amount, currency, remindersEnabled, onOpenSettings }) {
  const data = preview.data;
  return (
    <>
      <div className="mt-4 overflow-hidden rounded-[14px] border border-line" aria-busy={preview.isFetching}>
        <h3 className="flex items-center gap-2 border-b border-line bg-subtle px-3.5 py-2.5 font-sans text-sm font-semibold">
          <IconCalendarRepeat size={18} className="text-brand" aria-hidden="true" /> Upcoming renewal dates
        </h3>
        {data ? (
          <ul>
            {data.upcoming.map((row) => (
              <li
                key={row.date}
                className={`flex items-center justify-between gap-2 border-b border-line px-3.5 py-2 text-sm last:border-b-0 ${
                  row.monthEndAdjusted ? 'bg-amber-l' : ''
                }`}
              >
                <span className="flex flex-wrap items-center gap-x-1.5">
                  {formatDate(row.date)} {row.note && <Pill tone="amber">{row.note}</Pill>}
                </span>
                {amount && <b className="amt">{formatMoney(amount, currency)}</b>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3.5 py-1.5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="skel w-[55%]" />
            ))}
          </div>
        )}
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5" aria-live="polite">
        <ReminderNotes
          data={data}
          hasReminders={preview.hasReminders}
          remindersEnabled={remindersEnabled}
          currency={currency}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </>
  );
}

function chipLabel(daysBefore) {
  return REMINDER_CHIPS.find((chip) => chip.value === daysBefore)?.label ?? `${daysBefore} days`;
}

/** "24, 28 and 30 Oct" when the dates share a month, otherwise "28 Sep, 2 Oct and 4 Oct". */
function sendDatesText(dates) {
  const months = new Set(dates.map((date) => date.slice(0, 7)));
  if (months.size === 1) {
    const days = dates.map((date) => String(Number(date.slice(8, 10))));
    return `${joinWithAnd(days)} ${formatMonthShort(dates[0])}`;
  }
  return joinWithAnd(dates.map(formatDayMonth));
}

function ReminderNotes({ data, hasReminders, remindersEnabled, currency, onOpenSettings }) {
  if (!remindersEnabled) {
    return (
      <div className="note note-gray">
        <IconBellOff size={19} aria-hidden="true" />
        <div>
          Reminder emails are off, so none will be sent.{' '}
          <button type="button" className="link" onClick={onOpenSettings}>
            Turn on in Settings
          </button>
        </div>
      </div>
    );
  }
  if (!data || !hasReminders) {
    return null;
  }

  const sending = data.reminders.filter((reminder) => reminder.willSend);
  const skipped = data.reminders.filter((reminder) => !reminder.willSend);
  const time = formatSendTime(data.sendTime, data.timeZone, currency);
  const next = data.nextRenewalDate;

  return (
    <>
      {sending.length === 1 && (
        <div className="note note-blue">
          <IconBellRinging size={19} aria-hidden="true" />
          <div>
            Reminder for {formatDateShort(next)} goes out on {formatDayMonth(sending[0].sendDate)} at {time}.
          </div>
        </div>
      )}
      {sending.length > 1 && (
        <div className="note note-blue">
          <IconBellRinging size={19} aria-hidden="true" />
          <div>
            Reminders for {formatDayMonth(next)} go out on {sendDatesText(sending.map((reminder) => reminder.sendDate))} at{' '}
            {time}, once each.
          </div>
        </div>
      )}
      {skipped.length > 0 && (
        <div className="note note-amber">
          <IconClockPause size={19} aria-hidden="true" />
          <div>
            <b>{joinWithAnd(skipped.map((reminder) => chipLabel(reminder.daysBefore)))} skipped:</b>{' '}
            {skipped.length === 1 ? 'that day has passed.' : 'those days have passed.'} Reminders are never sent late.
          </div>
        </div>
      )}
    </>
  );
}
