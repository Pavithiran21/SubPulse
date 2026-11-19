import { DateTime } from 'luxon';

// Formatting in one place (UI-UX.md "Fixed lists and formatting"), so every screen writes
// money, dates and "in N days" the same way the emails do.

// The locale each currency is shown in; the backend's emails use the same map.
const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  AED: 'en-AE',
};

const moneyFormats = new Map();

function moneyFormat(currency, fractionDigits) {
  const key = `${currency}-${fractionDigits}`;
  if (!moneyFormats.has(key)) {
    moneyFormats.set(
      key,
      new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
    );
  }
  return moneyFormats.get(key);
}

/**
 * "₹1,00,000.00". The API sends money as a string ("349.00") and Intl formats a string
 * exactly, so the amount is never turned into a floating-point number.
 */
export function formatMoney(amount, currency) {
  return moneyFormat(currency, 2).format(amount);
}

/** Calendar chips and the phone list: "₹649" for a whole amount, "₹349.50" otherwise. */
export function formatMoneyCompact(amount, currency) {
  if (amount.endsWith('.00')) {
    return moneyFormat(currency, 0).format(amount.slice(0, -3));
  }
  return formatMoney(amount, currency);
}

/**
 * Phone calendar chips: "349.50", "2,199", "1,00,000", the compact rule without the currency
 * symbol. A day is only about 49 px wide there; each user has one currency, and the totals with
 * the symbol sit just above (UI-UX.md "Fixed lists and formatting").
 */
export function formatAmountCompact(amount, currency) {
  const whole = amount.endsWith('.00');
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(whole ? amount.slice(0, -3) : amount);
}

/** "1757.00" → 175700, an exact whole number. Used only to size the category bars. */
export function toCents(amount) {
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
}

// Luxon with the en-US locale writes September as "Sep" (en-GB now says "Sept").
function calendarDate(isoDate) {
  return DateTime.fromISO(isoDate, { zone: 'utc' }).setLocale('en-US');
}

/** "2026-10-20" → "Mon 20 Oct 2026", the same format as the emails. */
export function formatDate(isoDate) {
  return calendarDate(isoDate).toFormat('ccc d LLL yyyy');
}

/** "Mon 20 Oct": Next up and the phone list leave out the year. */
export function formatDateShort(isoDate) {
  return calendarDate(isoDate).toFormat('ccc d LLL');
}

/** "20 Oct", for the reminder note. */
export function formatDayMonth(isoDate) {
  return calendarDate(isoDate).toFormat('d LLL');
}

/** "Nov", for "last day of Nov". */
export function formatMonthShort(isoDate) {
  return calendarDate(isoDate).toFormat('LLL');
}

/** "2026-10" → "October 2026". */
export function formatMonth(month) {
  return DateTime.fromISO(`${month}-01`, { zone: 'utc' }).setLocale('en-US').toFormat('LLLL yyyy');
}

/** A moment (ISO UTC) shown as a date in the user's time zone: "2 Oct 2026". */
export function formatInstantDate(isoInstant, timeZone) {
  return DateTime.fromISO(isoInstant, { zone: 'utc' }).setZone(timeZone).setLocale('en-US').toFormat('d LLL yyyy');
}

/** 0 → "today", 1 → "tomorrow", otherwise "in N days". */
export function daysText(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** The phone list's shorter pill: "today", "tomorrow", "3 days". */
export function daysShortText(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `${days} days`;
}

/** Pill colour: red for 3 days or less, amber for 4–7, grey after that. */
export function daysTone(days) {
  if (days <= 3) return 'red';
  if (days <= 7) return 'amber';
  return 'gray';
}

/**
 * "9:00 am IST": the send time from the preview plus the short name of the user's time zone.
 * The short name comes from the currency's locale (en-IN knows "IST"); zones without a common
 * abbreviation show as "GMT+4".
 */
export function formatSendTime(sendTime, timeZone, currency) {
  const [hourText, minuteText] = sendTime.split(':');
  const hour = Number(hourText);
  const clock = `${hour % 12 || 12}:${minuteText} ${hour < 12 ? 'am' : 'pm'}`;
  const parts = new Intl.DateTimeFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(new Date());
  const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
  return `${clock} ${zoneName}`;
}

/** ["7", "3", "1"] → "7, 3 and 1". */
export function joinWithAnd(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
