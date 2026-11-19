import { queryKeys } from '../../api/queryKeys';

/**
 * After any subscription change: every list, count and single subscription, the dashboard totals
 * and the calendar can all show something different now, so they are fetched again.
 */
export function refreshSubscriptionData(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.calendarAll }),
  ]);
}
