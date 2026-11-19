import { DateTime } from 'luxon';
import { z } from 'zod';

// The drawer's checks, with the backend's exact messages (UI-UX.md "Validation messages").
// The server checks everything again; these only save a round trip.

const AMOUNT_GREATER_THAN_ZERO = 'Enter an amount greater than 0.';
const VALID_DATE = 'Enter a valid date.';
const EARLIEST_DATE = '2000-01-01';

/** "1,499.50 " → "1499.50": people type thousands separators; the API wants plain digits. */
export function cleanAmount(text) {
  return text.replace(/[\s,]/g, '');
}

/** Checked as text, never as a floating-point number. */
function amountProblem(text) {
  const amount = cleanAmount(text);
  if (!/^\d+(\.\d+)?$/.test(amount) && !/^\.\d+$/.test(amount)) return AMOUNT_GREATER_THAN_ZERO;
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > 2) return 'Use at most 2 decimal places.';
  if (/^0*$/.test(whole) && /^0*$/.test(fraction)) return AMOUNT_GREATER_THAN_ZERO;
  if (whole.replace(/^0+/, '').length > 8) return 'Enter an amount below 100,000,000.';
  return null;
}

/** Dates before 2000 or more than 10 years after today are refused, as on the server. */
export function latestDate(timeZone) {
  return DateTime.now().setZone(timeZone).plus({ years: 10 }).toISODate();
}

export function subscriptionSchema(timeZone) {
  const latest = latestDate(timeZone);
  const isValidDate = (value) => DateTime.fromISO(value).isValid && value >= EARLIEST_DATE && value <= latest;

  return z
    .object({
      name: z.string().trim().min(1, 'Enter a name, like Netflix.').max(80, 'Use at most 80 characters.'),
      category: z.string().min(1, 'Pick a category.'),
      amount: z.string().superRefine((value, context) => {
        const problem = amountProblem(value);
        if (problem) context.addIssue({ code: 'custom', message: problem });
      }),
      paymentMethod: z.string().trim().max(40, 'Use at most 40 characters.'),
      billingCycle: z.string().min(1, 'Pick how often it renews.'),
      startDate: z.string().refine(isValidDate, VALID_DATE),
      nextRenewalDate: z.string().refine((value) => value === '' || isValidDate(value), VALID_DATE),
      reminderDays: z.array(z.number()).min(1, 'Pick at least one reminder, or turn reminders off in Settings.'),
      notes: z.string().max(500, 'Use at most 500 characters.'),
    })
    .refine((values) => values.nextRenewalDate === '' || values.nextRenewalDate >= values.startDate, {
      path: ['nextRenewalDate'],
      message: "Next renewal can't be before the start date.",
    });
}

export const FORM_FIELDS = [
  'name',
  'category',
  'amount',
  'paymentMethod',
  'billingCycle',
  'startDate',
  'nextRenewalDate',
  'reminderDays',
  'notes',
];
