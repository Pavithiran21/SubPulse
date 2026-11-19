import { apiRequest } from './client';
import { toQuery } from './subscriptions';

/** Totals, spend by category and the next three renewals. Every amount is computed by the API. */
export function getDashboard() {
  return apiRequest('/dashboard');
}

/** One month of renewals ("2026-10"); without a month, this month in the user's time zone. */
export function getCalendar(month) {
  return apiRequest(`/calendar${toQuery({ month })}`);
}

/**
 * The drawer's live preview: the pre-filled next renewal, the next four renewal dates with
 * month-end notes, and when each reminder goes out. The browser never does this date maths.
 */
export function getRenewalPreview({ billingCycle, startDate, nextRenewalDate, reminderDays }) {
  return apiRequest(`/renewals/preview${toQuery({ billingCycle, startDate, nextRenewalDate, reminderDays })}`);
}
