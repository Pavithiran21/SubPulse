import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { getRenewalPreview } from '../../api/dashboard';
import { queryKeys } from '../../api/queryKeys';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const DEBOUNCE_MS = 300;

/**
 * The drawer's live preview from GET /renewals/preview, asked again 300 ms after the cycle,
 * the dates or the reminder chips stop changing. The dates it returns are the ones the reminder
 * job will use, so the browser never does renewal date maths itself.
 * Without reminder chips the API would use the user's defaults, so the reminder part is ignored then.
 */
export function useRenewalPreview({ billingCycle, startDate, nextRenewalDate, reminderDays, enabled }) {
  // Debounced as one string: a new object on every render would restart the timer for ever.
  const key = JSON.stringify({
    billingCycle,
    startDate,
    nextRenewalDate: nextRenewalDate || undefined,
    reminderDays: reminderDays.length > 0 ? [...reminderDays].sort((a, b) => b - a).join(',') : undefined,
  });
  const params = JSON.parse(useDebouncedValue(key, DEBOUNCE_MS));

  const datesOk =
    DateTime.fromISO(params.startDate ?? '').isValid &&
    (!params.nextRenewalDate || (DateTime.fromISO(params.nextRenewalDate).isValid && params.nextRenewalDate >= params.startDate));

  const query = useQuery({
    queryKey: queryKeys.preview(params),
    queryFn: () => getRenewalPreview(params),
    enabled: enabled && Boolean(params.billingCycle) && datesOk,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });

  return { ...query, hasReminders: Boolean(params.reminderDays) };
}
