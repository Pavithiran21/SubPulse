// Every TanStack Query key in one place, so a change can invalidate exactly what it affects.
// Keys are arrays: invalidating ['subscriptions'] also refreshes every list, count and single item under it.
export const queryKeys = {
  me: ['me'],
  subscriptions: ['subscriptions'],
  subscriptionList: (params) => ['subscriptions', 'list', params],
  statusCounts: (params) => ['subscriptions', 'counts', params],
  subscription: (id) => ['subscriptions', 'one', String(id)],
  dashboard: ['dashboard'],
  calendar: (month) => ['calendar', month ?? 'current'],
  calendarAll: ['calendar'],
  preview: (params) => ['renewal-preview', params],
  demo: ['demo'],
};
