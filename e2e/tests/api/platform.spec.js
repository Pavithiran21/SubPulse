const { test, expect } = require('@playwright/test');
const { apiUrl, failure, json, newUser, runReminders } = require('../../helpers/api');

// The edges of the API: health, unknown routes, the job endpoint's guard and the demo log-in.
// (Runs of the job itself are in tests/jobs, because a run touches every user's subscriptions.)

test.describe('health and unknown routes', () => {
  test('/api/health reports the database, and an unknown /api route is a JSON 404 with a request id', async ({ request }) => {
    expect(await json(await request.get(apiUrl('/health')), 200)).toEqual({ status: 'ok', db: 'up' });
    // Signed out, every /api route except the public ones answers 401, so nothing leaks about which exist.
    await failure(await request.get(apiUrl('/no-such-route')), 401, 'UNAUTHENTICATED');
    const api = await newUser(request);
    const error = await failure(await api.get('/no-such-route'), 404, 'ROUTE_NOT_FOUND');
    expect(error.requestId).toBeTruthy();
  });

  test('a malformed JSON body is a 400 INVALID_JSON, not a 500', async ({ request }) => {
    const response = await request.post(apiUrl('/auth/login'), { data: '{"email":', headers: { 'Content-Type': 'application/json' } });
    await failure(response, 400, 'INVALID_JSON');
  });

  test('security headers are on: nosniff, and no server version leaks', async ({ request }) => {
    const headers = (await request.get(apiUrl('/health'))).headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['server'] ?? '').not.toMatch(/\d/);
  });
});

test.describe('the reminder job endpoint', () => {
  test('needs the job secret: none or a wrong one is 401, and a bad time is a 400', async ({ request }) => {
    await failure(await runReminders(request, '2027-01-07T04:00:00Z', null), 401, 'JOB_SECRET_INVALID');
    await failure(await runReminders(request, '2027-01-07T04:00:00Z', 'not-the-secret'), 401, 'JOB_SECRET_INVALID');
    expect((await runReminders(request, 'next tuesday')).status()).toBe(400);
  });
});

test.describe('the demo log-in', () => {
  test('/api/demo lists the demo account but never a password or inbox login; logging in returns a demo user and a cookie', async ({ request }) => {
    const info = await json(await request.get(apiUrl('/demo')), 200);
    expect(info).toEqual({ accounts: [{ role: 'User', email: 'user@demo.subpulse.test' }] });
    const raw = JSON.stringify(info);
    expect(raw).not.toContain(process.env.DEMO_PASSWORD);
    if (process.env.DEMO_SMTP_PASS) expect(raw).not.toContain(process.env.DEMO_SMTP_PASS);

    const response = await request.post(apiUrl('/demo/login'), { data: { role: 'User' } });
    const session = await json(response, 200);
    expect(session.user).toMatchObject({ email: 'user@demo.subpulse.test', isDemo: true });
    expect(response.headers()['set-cookie']).toMatch(/HttpOnly/i);
    const me = await request.get(apiUrl('/me'), { headers: { Authorization: `Bearer ${session.accessToken}` } });
    expect(me.status()).toBe(200);
    await failure(await request.post(apiUrl('/demo/login'), { data: { role: 'Admin' } }), 400, 'VALIDATION_FAILED');
  });
});
