import { apiRequest } from './client';

/** Builds "?a=1&b=2" from the values that are set. */
export function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** One page: { items, page, size, totalItems, totalPages }. status may be a comma list. */
export function listSubscriptions({ q, status, category, page, size, sort }) {
  return apiRequest(`/subscriptions${toQuery({ q, status, category, page, size, sort })}`);
}

/** { ACTIVE, PAUSED, CANCELLED, ARCHIVED } for the same search and category. */
export function getStatusCounts({ q, category }) {
  return apiRequest(`/subscriptions/status-counts${toQuery({ q, category })}`);
}

export function getSubscription(id) {
  return apiRequest(`/subscriptions/${id}`);
}

export function createSubscription(body) {
  return apiRequest('/subscriptions', { method: 'POST', body });
}

/** body must carry the version that was loaded; another version answers 409 CONCURRENT_UPDATE. */
export function updateSubscription(id, body) {
  return apiRequest(`/subscriptions/${id}`, { method: 'PUT', body });
}

export function deleteSubscription(id) {
  return apiRequest(`/subscriptions/${id}`, { method: 'DELETE' });
}

/** action is pause, resume, cancel, archive or restore. A change the status doesn't allow answers 422. */
export function changeStatus(id, action) {
  return apiRequest(`/subscriptions/${id}/${action}`, { method: 'POST' });
}
