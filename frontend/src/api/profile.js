import { apiRequest, setAccessToken } from './client';

export function getMe() {
  return apiRequest('/me');
}

/** PATCH /me with any of { name, timeZone, currency, remindersEnabled, defaultReminderDays }. Returns the user. */
export function updateProfile(changes) {
  return apiRequest('/me', { method: 'PATCH', body: changes });
}

export async function changePassword({ currentPassword, newPassword }) {
  const result = await apiRequest('/me/password', { method: 'POST', body: { currentPassword, newPassword } });
  // Every other session is logged out; this one continues with the new token (and a new cookie).
  setAccessToken(result.accessToken);
}

export function deleteAccount(password) {
  return apiRequest('/me', { method: 'DELETE', body: { password } });
}
