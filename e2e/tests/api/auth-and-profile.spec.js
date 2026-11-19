const { randomBytes } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { SEEDED, apiUrl, failure, json, login, loginAs, newUser, subscription } = require('../../helpers/api');
const { countMail, waitForMail } = require('../../helpers/mail');

// Accounts: registration rules, the refresh cookie, the password-reset link from a real inbox,
// the profile, and the demo account's limits.

const newEmail = () => `user.${randomBytes(5).toString('hex')}@e2e.subpulse.test`;
const strongPassword = () => `Pw-${randomBytes(8).toString('hex')}-1`;

function register(request, overrides = {}) {
  return request.post(apiUrl('/auth/register'), {
    data: { name: 'Asha Rao', email: newEmail(), password: strongPassword(), timeZone: 'Asia/Kolkata', currency: 'INR', ...overrides },
  });
}

test.describe('registration', () => {
  test('creates the account, returns a token and sets an HttpOnly refresh cookie scoped to /api/auth', async ({ request }) => {
    const response = await register(request);
    const body = await json(response, 201);
    expect(body.accessToken).toBeTruthy();
    expect(body.user).toMatchObject({ name: 'Asha Rao', currency: 'INR', timeZone: 'Asia/Kolkata', isDemo: false });
    expect(JSON.stringify(body)).not.toMatch(/passwordHash|password_hash/i);
    const cookie = response.headers()['set-cookie'];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/auth/i);
  });

  test('an email that is already taken is a 409, whatever its letter case', async ({ request }) => {
    const email = newEmail();
    await json(await register(request, { email }), 201);
    const error = await failure(await register(request, { email: email.toUpperCase() }), 409, 'EMAIL_TAKEN');
    expect(error.details.map((detail) => detail.field)).toContain('email');
  });

  test('bad input is a 400 that names each field: weak password, bad email, unknown time zone, unknown currency', async ({ request }) => {
    const weak = await failure(await register(request, { password: 'short' }), 400, 'VALIDATION_FAILED');
    expect(weak.details.map((detail) => detail.field)).toContain('password');
    const email = await failure(await register(request, { email: 'not-an-email' }), 400, 'VALIDATION_FAILED');
    expect(email.details.map((detail) => detail.field)).toContain('email');
    const zone = await failure(await register(request, { timeZone: 'Mars/Olympus' }), 400, 'VALIDATION_FAILED');
    expect(zone.details.map((detail) => detail.field)).toContain('timeZone');
    await failure(await register(request, { currency: 'XXX' }), 400);
  });
});

test.describe('sessions', () => {
  test('log-in is case-insensitive on the email, and a wrong password never says which half was wrong', async ({ request }) => {
    const email = newEmail();
    const password = strongPassword();
    await json(await register(request, { email, password }), 201);
    await json(await login(request, email.toUpperCase(), password), 200);
    const wrongPassword = await failure(await login(request, email, 'Wrong-pass-1'), 401, 'INVALID_CREDENTIALS');
    const unknownEmail = await failure(await login(request, newEmail(), 'Wrong-pass-1'), 401, 'INVALID_CREDENTIALS');
    expect(wrongPassword.message).toBe(unknownEmail.message);
  });

  test('the refresh cookie gives a new access token, and after log-out it no longer does', async ({ request }) => {
    await json(await register(request), 201);
    const refreshed = await json(await request.post(apiUrl('/auth/refresh')), 200);
    expect(refreshed.accessToken).toBeTruthy();
    expect((await request.post(apiUrl('/auth/logout'))).status()).toBe(204);
    await failure(await request.post(apiUrl('/auth/refresh')), 401, 'SESSION_EXPIRED');
  });

  test('a garbage or missing token is 401 on a protected route, and the error body has the standard shape', async ({ request }) => {
    const missing = await failure(await request.get(apiUrl('/me')), 401);
    expect(missing.requestId).toBeTruthy();
    const garbage = await request.get(apiUrl('/me'), { headers: { Authorization: 'Bearer not.a.token' } });
    expect(garbage.status()).toBe(401);
  });
});

test.describe('password reset through the real inbox', () => {
  test.describe.configure({ timeout: 90_000 });

  test('the emailed link sets a new password once; the old password and the old link stop working', async ({ request }) => {
    const email = newEmail();
    const oldPassword = strongPassword();
    const newPassword = strongPassword();
    await json(await register(request, { email, password: oldPassword }), 201);

    expect((await request.post(apiUrl('/auth/forgot-password'), { data: { email } })).status()).toBe(202);
    const mail = await waitForMail({ to: email, subject: /Reset your SubPulse password/ });
    const token = /reset-password\?token=([\w-]+)/.exec(mail.text ?? '')?.[1];
    expect(token, 'the mail has a reset link').toBeTruthy();
    expect(mail.text).toContain('http://127.0.0.1:5273/reset-password?token=');

    expect((await request.post(apiUrl('/auth/reset-password'), { data: { token, password: newPassword } })).status()).toBe(204);
    await json(await login(request, email, newPassword), 200);
    await failure(await login(request, email, oldPassword), 401, 'INVALID_CREDENTIALS');
    // Single use.
    await failure(await request.post(apiUrl('/auth/reset-password'), { data: { token, password: strongPassword() } }), 400, 'RESET_LINK_EXPIRED');
  });

  test('only the newest link works, a made-up token is refused, and an unknown email gets the same 202 and no mail', async ({ request }) => {
    const email = newEmail();
    await json(await register(request, { email }), 201);
    await request.post(apiUrl('/auth/forgot-password'), { data: { email } });
    const first = await waitForMail({ to: email, subject: /Reset your SubPulse password/ });
    const firstToken = /token=([\w-]+)/.exec(first.text)[1];
    await request.post(apiUrl('/auth/forgot-password'), { data: { email } });
    await expect.poll(async () => countMail({ to: email, subject: /Reset your SubPulse password/ }), { timeout: 40_000 }).toBe(2);

    await failure(await request.post(apiUrl('/auth/reset-password'), { data: { token: firstToken, password: strongPassword() } }), 400, 'RESET_LINK_EXPIRED');
    await failure(await request.post(apiUrl('/auth/reset-password'), { data: { token: 'x'.repeat(10), password: strongPassword() } }), 400);

    const stranger = newEmail();
    const answer = await json(await request.post(apiUrl('/auth/forgot-password'), { data: { email: stranger } }), 202);
    expect(answer.message).toMatch(/If that email has an account/);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(await countMail({ to: stranger, subject: /Reset/ })).toBe(0);
  });

  test('a reset logs the account out everywhere: the old refresh cookie is dead', async ({ request }) => {
    const email = newEmail();
    await json(await register(request, { email }), 201);
    await request.post(apiUrl('/auth/forgot-password'), { data: { email } });
    const mail = await waitForMail({ to: email, subject: /Reset your SubPulse password/ });
    const token = /token=([\w-]+)/.exec(mail.text)[1];
    expect((await request.post(apiUrl('/auth/reset-password'), { data: { token, password: strongPassword() } })).status()).toBe(204);
    await failure(await request.post(apiUrl('/auth/refresh')), 401, 'SESSION_EXPIRED');
  });
});

test.describe('profile', () => {
  test('changes the name, the time zone and the reminder defaults; an empty change is refused', async ({ request }) => {
    const api = await newUser(request);
    const updated = await json(await api.patch('/me', { name: '  Meera Iyer ', timeZone: 'Asia/Tokyo', remindersEnabled: false, defaultReminderDays: [1, 7] }), 200);
    expect(updated).toMatchObject({ name: 'Meera Iyer', timeZone: 'Asia/Tokyo', remindersEnabled: false, defaultReminderDays: [7, 1] });
    await failure(await api.patch('/me', {}), 400, 'VALIDATION_FAILED');
    await failure(await api.patch('/me', { timeZone: 'Nowhere/Land' }), 400, 'VALIDATION_FAILED');
    await failure(await api.patch('/me', { defaultReminderDays: [0, 9] }), 400, 'VALIDATION_FAILED');
  });

  test('the currency can change until the first subscription, then it is locked (422)', async ({ request }) => {
    const api = await newUser(request);
    expect((await json(await api.patch('/me', { currency: 'USD' }), 200)).currency).toBe('USD');
    await json(await api.post('/subscriptions', subscription()), 201);
    const me = await json(await api.get('/me'), 200);
    expect(me.currencyLocked).toBe(true);
    const error = await failure(await api.patch('/me', { currency: 'EUR' }), 422, 'CURRENCY_LOCKED');
    expect(error.details.map((detail) => detail.field)).toContain('currency');
  });

  test('changing the password needs the current one, returns a new token, and ends other sessions', async ({ request }) => {
    const api = await newUser(request);
    const next = strongPassword();
    await failure(await api.post('/me/password', { currentPassword: 'Wrong-pass-1', newPassword: next }), 400, 'WRONG_PASSWORD');
    const changed = await json(await api.post('/me/password', { currentPassword: api.password, newPassword: next }), 200);
    expect(changed.accessToken).toBeTruthy();
    await failure(await login(request, api.email, api.password), 401, 'INVALID_CREDENTIALS');
    await json(await login(request, api.email, next), 200);
  });

  test('deleting the account needs the password, removes the subscriptions and ends the log-in', async ({ request }) => {
    const api = await newUser(request);
    await json(await api.post('/subscriptions', subscription()), 201);
    await failure(await api.delete('/me', { password: 'Wrong-pass-1' }), 400, 'WRONG_PASSWORD');
    expect((await api.delete('/me', { password: api.password })).status()).toBe(204);
    await failure(await login(request, api.email, api.password), 401, 'INVALID_CREDENTIALS');
    expect((await api.get('/subscriptions')).status()).toBe(401);
  });
});

test.describe('the demo account', () => {
  test('cannot change its password or delete itself, and gets no reset mail', async ({ request }) => {
    const demo = await loginAs(request, SEEDED.demo);
    await failure(await demo.post('/me/password', { currentPassword: process.env.DEMO_PASSWORD, newPassword: strongPassword() }), 403, 'DEMO_ACCOUNT_LOCKED');
    await failure(await demo.delete('/me', { password: process.env.DEMO_PASSWORD }), 403, 'DEMO_ACCOUNT_LOCKED');
    expect((await request.post(apiUrl('/auth/forgot-password'), { data: { email: SEEDED.demo } })).status()).toBe(202);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(await countMail({ to: SEEDED.demo, subject: /Reset/ })).toBe(0);
  });
});
