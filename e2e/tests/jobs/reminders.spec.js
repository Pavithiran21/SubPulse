const { test, expect } = require('@playwright/test');
const { apiUrl, json, newUser, runReminders, subscription } = require('../../helpers/api');
const { countMail, waitForMail } = require('../../helpers/mail');

// The signature feature, part two: one reminder per renewal, even when the job runs again or several
// runs overlap. A job run looks at EVERY user's subscriptions (and moves passed renewals forward), so
// these tests run in their own project, one at a time, after all the other tests have finished.

test.describe.configure({ mode: 'serial', timeout: 120_000 });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('run three times and then three at once for the same day: the reminder email is sent exactly once', async ({ request }) => {
  const api = await newUser(request);
  // Renews 10 Jan 2027; reminder 3 days before, at 09:00 in Kolkata = 03:30 UTC on 7 Jan.
  const name = `Spotify ${Date.now()}`;
  await json(await api.post('/subscriptions', subscription({ name, startDate: '2026-12-10', nextRenewalDate: '2027-01-10', reminderDays: [3] })), 201);

  const at = '2027-01-07T04:00:00Z';
  expect((await runReminders(request, at, null)).status()).toBe(401);
  const first = await json(await runReminders(request, at), 200);
  expect(first.remindersSent).toBeGreaterThanOrEqual(1);
  // Later runs find the reminder already claimed (UNIQUE subscription, renewal date, days before): nothing to send.
  for (let i = 0; i < 2; i += 1) expect((await json(await runReminders(request, at), 200)).remindersSent).toBe(0);
  const parallel = await Promise.all([1, 2, 3].map(() => runReminders(request, at)));
  for (const response of parallel) expect(response.status()).toBe(200);
  const sentByParallelRuns = (await Promise.all(parallel.map((response) => response.json()))).reduce((sum, run) => sum + run.remindersSent, 0);
  expect(sentByParallelRuns).toBe(0);

  const subject = new RegExp(name);
  const mail = await waitForMail({ to: api.email, subject });
  expect(mail.subject).toMatch(/3 days|in 3/i);
  await pause(4000); // give any duplicate a moment to arrive, then count
  expect(await countMail({ to: api.email, subject })).toBe(1);
});

test('five overlapping runs for a brand-new reminder: exactly one sends it, the rest count a duplicate', async ({ request }) => {
  const api = await newUser(request);
  const name = `Overlap ${Date.now()}`;
  await json(await api.post('/subscriptions', subscription({ name, startDate: '2027-02-01', nextRenewalDate: '2027-03-01', reminderDays: [3] })), 201);
  // 26 Feb 2027 (3 days before 1 March), 09:30 in Kolkata.
  const runs = await Promise.all(Array.from({ length: 5 }, () => runReminders(request, '2027-02-26T04:00:00Z')));
  const summaries = await Promise.all(runs.map((response) => response.json()));
  expect(runs.map((response) => response.status())).toEqual([200, 200, 200, 200, 200]);
  expect(summaries.reduce((sum, run) => sum + run.remindersSent, 0)).toBe(1);
  await waitForMail({ to: api.email, subject: new RegExp(name) });
  await pause(4000);
  expect(await countMail({ to: api.email, subject: new RegExp(name) })).toBe(1);
});

test('no reminder before 09:00 local time, and none for a paused subscription', async ({ request }) => {
  const api = await newUser(request);
  const name = `Gym ${Date.now()}`;
  const paused = `Paused ${Date.now()}`;
  await json(await api.post('/subscriptions', subscription({ name, startDate: '2026-12-20', nextRenewalDate: '2027-01-20', reminderDays: [1] })), 201);
  const toPause = await json(await api.post('/subscriptions', subscription({ name: paused, startDate: '2026-12-20', nextRenewalDate: '2027-01-20', reminderDays: [1] })), 201);
  await json(await api.post(`/subscriptions/${toPause.id}/pause`), 200);

  // 19 Jan, 08:00 in Kolkata (02:30 UTC): too early.
  await json(await runReminders(request, '2027-01-19T02:30:00Z'), 200);
  await pause(3000);
  expect(await countMail({ to: api.email, subject: new RegExp(name) })).toBe(0);

  // 09:30 in Kolkata: the active one is sent, the paused one never.
  await json(await runReminders(request, '2027-01-19T04:00:00Z'), 200);
  await waitForMail({ to: api.email, subject: new RegExp(name) });
  expect(await countMail({ to: api.email, subject: new RegExp(paused) })).toBe(0);
});

test('"9 am" is the user\'s own 9 am: a user in Auckland is reminded at 20:00 UTC the evening before', async ({ request }) => {
  const api = await newUser(request, { timeZone: 'Pacific/Auckland' });
  const name = `Auckland ${Date.now()}`;
  // Renews 10 Mar 2027; reminder 1 day before = 9 Mar 09:00 NZDT (UTC+13) = 8 Mar 20:00 UTC.
  await json(await api.post('/subscriptions', subscription({ name, startDate: '2027-02-10', nextRenewalDate: '2027-03-10', reminderDays: [1] })), 201);
  await json(await runReminders(request, '2027-03-08T19:30:00Z'), 200);
  await pause(3000);
  expect(await countMail({ to: api.email, subject: new RegExp(name) })).toBe(0);
  const sent = await json(await runReminders(request, '2027-03-08T20:30:00Z'), 200);
  expect(sent.remindersSent).toBeGreaterThanOrEqual(1);
  await waitForMail({ to: api.email, subject: new RegExp(name) });
});

test('several "days before" choices send one mail each, on their own days, and none when reminders are switched off', async ({ request }) => {
  const api = await newUser(request);
  const name = `Multi ${Date.now()}`;
  await json(await api.post('/subscriptions', subscription({ name, startDate: '2027-04-01', nextRenewalDate: '2027-05-20', reminderDays: [7, 1] })), 201);
  await json(await runReminders(request, '2027-05-13T04:00:00Z'), 200); // 7 days before
  await json(await runReminders(request, '2027-05-19T04:00:00Z'), 200); // 1 day before
  await expect.poll(() => countMail({ to: api.email, subject: new RegExp(name) }), { timeout: 40_000 }).toBe(2);

  const quiet = await newUser(request);
  const quietName = `Quiet ${Date.now()}`;
  await json(await quiet.patch('/me', { remindersEnabled: false }), 200);
  await json(await quiet.post('/subscriptions', subscription({ name: quietName, startDate: '2027-04-01', nextRenewalDate: '2027-05-20', reminderDays: [1] })), 201);
  await json(await runReminders(request, '2027-05-19T04:00:00Z'), 200);
  await pause(3000);
  expect(await countMail({ to: quiet.email, subject: new RegExp(quietName) })).toBe(0);
});

test('a renewal that has passed is moved to the next one from the anchor: 31 January -> 28 February -> 31 March', async ({ request }) => {
  const api = await newUser(request);
  const saved = await json(await api.post('/subscriptions', subscription({ name: 'Anchored', startDate: '2026-01-31', amount: 100 })), 201);
  const farOff = await json(await runReminders(request, '2027-02-20T04:00:00Z'), 200);
  expect(farOff.renewalsAdvanced).toBeGreaterThanOrEqual(1);
  expect((await json(await api.get(`/subscriptions/${saved.id}`), 200)).nextRenewalDate).toBe('2027-02-28');
  await json(await runReminders(request, '2027-03-05T04:00:00Z'), 200);
  expect((await json(await api.get(`/subscriptions/${saved.id}`), 200)).nextRenewalDate).toBe('2027-03-31');
});

test('a run reports counts only, never names or addresses', async ({ request }) => {
  const summary = await json(await runReminders(request, '2031-06-15T04:00:00Z'), 200);
  expect(Object.keys(summary).sort()).toEqual(['asOf', 'duplicatesSkipped', 'emailFailures', 'remindersSent', 'renewalsAdvanced', 'runId', 'subscriptionsChecked']);
  expect(JSON.stringify(summary)).not.toMatch(/@/);
});

test('the demo user\'s reminder goes to the demo inbox (DEMO_SMTP_*), and the main inbox never sees it', async ({ request }) => {
  const session = await json(await request.post(apiUrl('/demo/login'), { data: { role: 'User' } }), 200);
  const authed = { Authorization: `Bearer ${session.accessToken}` };
  const name = `Demo reminder ${Date.now()}`;
  await json(await request.patch(apiUrl('/me'), { headers: authed, data: { remindersEnabled: true } }), 200);
  try {
    await json(await request.post(apiUrl('/subscriptions'), {
      headers: authed,
      data: { name, category: 'MUSIC', amount: 99, billingCycle: 'MONTHLY', startDate: '2028-02-10', nextRenewalDate: '2028-03-10', reminderDays: [3] },
    }), 201);
    await json(await runReminders(request, '2028-03-07T04:00:00Z'), 200);
    const mail = await waitForMail({ to: 'user@demo.subpulse.test', subject: new RegExp(name), inbox: 'DEMO_SMTP' });
    expect(mail.to.text).toContain('user@demo.subpulse.test');
    await expect(waitForMail({ to: 'user@demo.subpulse.test', subject: new RegExp(name), inbox: 'SMTP', timeoutMs: 5000 })).rejects.toThrow(/No mail/);
  } finally {
    await request.patch(apiUrl('/me'), { headers: authed, data: { remindersEnabled: false } });
  }
});
