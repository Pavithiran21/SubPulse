const { randomBytes } = require('node:crypto');
const { expect } = require('@playwright/test');

// A small API client over Playwright's request context. Every test registers its own user, so its
// subscriptions are its own; the reminder job is run "as of" a chosen moment through its endpoint.

const SEEDED = { user: 'user@test.subpulse.test', demo: 'demo@test.subpulse.test' };

function apiUrl(pathname) {
  return `${process.env.E2E_API_URL}${pathname}`;
}

function client(request, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const call = (method) => (pathname, data) => request.fetch(apiUrl(pathname), { method, headers, ...(data === undefined ? {} : { data }) });
  return { get: call('GET'), post: call('POST'), put: call('PUT'), patch: call('PATCH'), delete: call('DELETE'), token };
}

/** The JSON body of a response that must have the given status. */
async function json(response, status) {
  const text = await response.text();
  expect(response.status(), text.slice(0, 500)).toBe(status);
  return text ? JSON.parse(text) : null;
}

async function newUser(request, { timeZone = 'Asia/Kolkata', currency = 'INR' } = {}) {
  const email = `user.${randomBytes(5).toString('hex')}@e2e.subpulse.test`;
  const password = `Pw-${randomBytes(8).toString('hex')}-1`;
  const body = await json(await request.post(apiUrl('/auth/register'), { data: { name: 'Test User', email, password, timeZone, currency } }), 201);
  return { ...client(request, body.accessToken), email, password };
}

async function loginAs(request, email, password = process.env.DEMO_PASSWORD) {
  const body = await json(await request.post(apiUrl('/auth/login'), { data: { email, password } }), 200);
  return client(request, body.accessToken);
}

function subscription(overrides = {}) {
  return {
    name: `Netflix ${randomBytes(3).toString('hex')}`,
    category: 'ENTERTAINMENT',
    amount: 649,
    billingCycle: 'MONTHLY',
    startDate: '2026-01-15',
    reminderDays: [3],
    ...overrides,
  };
}

function runReminders(request, at, secret = process.env.JOB_TRIGGER_SECRET) {
  return request.post(apiUrl('/internal/jobs/reminders'), { data: { at }, headers: secret ? { 'X-Job-Secret': secret } : {} });
}

/** The last day of a month (1-12). */
function lastDay(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The error body of a response that must have the given status: { code, message, details, requestId }. */
async function failure(response, status, code) {
  const body = await json(response, status);
  expect(body.error, JSON.stringify(body)).toBeTruthy();
  if (code) expect(body.error.code).toBe(code);
  return body.error;
}

/** Logs in with email and password; resolves to the response, so a test can look at any status. */
function login(request, email, password) {
  return request.post(apiUrl('/auth/login'), { data: { email, password } });
}

module.exports = { SEEDED, apiUrl, client, json, failure, login, newUser, loginAs, subscription, runReminders, lastDay };
