import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { getCalendar, getDashboard } from '../../api/dashboard';
import { queryKeys } from '../../api/queryKeys';

/** Totals, spend by category and Next up. The band, the phone header and the calendar page share it. */
export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboard });
}

/** One month of renewals ("2026-10"). The previous month stays on screen while the next one loads. */
export function useCalendar(month, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.calendar(month),
    queryFn: () => getCalendar(month),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** "Today" in the user's time zone, which is what the API calls today too. */
export function todayIn(timeZone) {
  return DateTime.now().setZone(timeZone);
}

/** "2026-10": this month in the user's time zone. */
export function currentMonth(timeZone) {
  return todayIn(timeZone).toFormat('yyyy-MM');
}
