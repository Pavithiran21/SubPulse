const { test, expect } = require('@playwright/test');
const { failure, json, lastDay, newUser, subscription } = require('../../helpers/api');

// The signature feature, part one: renewal dates that don't drift at month-end.

const day = (iso) => Number(iso.slice(8, 10));
const month = (iso) => Number(iso.slice(5, 7));
const year = (iso) => Number(iso.slice(0, 4));

test.describe('renewal dates', () => {
  test('a monthly plan started on 31 January renews on the last day of shorter months and on the 31st again', async ({ request }) => {
    const api = await newUser(request);
    const preview = await json(await api.get('/renewals/preview?billingCycle=MONTHLY&startDate=2026-01-31'), 200);
    expect(preview.upcoming.length).toBeGreaterThanOrEqual(3);
    for (const renewal of preview.upcoming) {
      const expected = Math.min(31, lastDay(year(renewal.date), month(renewal.date)));
      expect(day(renewal.date), renewal.date).toBe(expected);
      expect(renewal.monthEndAdjusted).toBe(expected < 31);
    }
    // At least one short month in the next few, and the date comes back to the 31st after it.
    expect(preview.upcoming.some((renewal) => renewal.monthEndAdjusted)).toBe(true);
    expect(preview.upcoming.some((renewal) => day(renewal.date) === 31)).toBe(true);
  });

  test('a yearly plan started on 29 February renews on 28 February in common years', async ({ request }) => {
    const api = await newUser(request);
    const preview = await json(await api.get('/renewals/preview?billingCycle=YEARLY&startDate=2024-02-29'), 200);
    for (const renewal of preview.upcoming) {
      const leap = lastDay(year(renewal.date), 2) === 29;
      expect(renewal.date.slice(5)).toBe(leap ? '02-29' : '02-28');
    }
  });

  test('weekly, quarterly and 30th-of-month plans keep their rhythm', async ({ request }) => {
    const api = await newUser(request);
    const weekly = await json(await api.get('/renewals/preview?billingCycle=WEEKLY&startDate=2026-01-05'), 200);
    for (let i = 1; i < weekly.upcoming.length; i += 1) {
      const days = (Date.parse(weekly.upcoming[i].date) - Date.parse(weekly.upcoming[i - 1].date)) / 86_400_000;
      expect(days).toBe(7);
    }
    const quarterly = await json(await api.get('/renewals/preview?billingCycle=QUARTERLY&startDate=2026-01-31'), 200);
    for (const renewal of quarterly.upcoming) {
      expect(day(renewal.date), renewal.date).toBe(Math.min(31, lastDay(year(renewal.date), month(renewal.date))));
      expect([1, 4, 7, 10]).toContain(month(renewal.date));
    }
    const thirtieth = await json(await api.get('/renewals/preview?billingCycle=MONTHLY&startDate=2026-01-30'), 200);
    for (const renewal of thirtieth.upcoming) {
      expect(day(renewal.date), renewal.date).toBe(Math.min(30, lastDay(year(renewal.date), month(renewal.date))));
    }
  });

  test('a saved subscription keeps its anchor: 31 January -> the next renewal is a month-end, never a drifted 28th', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ startDate: '2026-01-31' })), 201);
    const next = saved.nextRenewalDate;
    expect(day(next)).toBe(Math.min(31, lastDay(year(next), month(next))));
  });

  test('editing a month-end plan without touching its dates keeps the 31st anchor', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ name: 'Anchor', startDate: '2026-01-31', amount: 100 })), 201);
    const edited = await json(await api.put(`/subscriptions/${saved.id}`, {
      name: 'Anchor (renamed)', category: saved.category, amount: 120, billingCycle: saved.billingCycle,
      startDate: saved.startDate, nextRenewalDate: saved.nextRenewalDate, reminderDays: saved.reminderDays, version: saved.version,
    }), 200);
    expect(edited.nextRenewalDate).toBe(saved.nextRenewalDate);
    const preview = await json(await api.get(`/renewals/preview?billingCycle=MONTHLY&startDate=2026-01-31&nextRenewalDate=${saved.nextRenewalDate}`), 200);
    expect(preview.upcoming.some((renewal) => day(renewal.date) === 31)).toBe(true);
  });

  test('the preview says which reminders will be sent: a reminder whose day has passed is skipped, never sent late', async ({ request }) => {
    const api = await newUser(request);
    const today = (await json(await api.get('/dashboard'), 200)).today;
    const inTwoDays = new Date(Date.parse(`${today}T00:00:00Z`) + 2 * 86_400_000).toISOString().slice(0, 10);
    const preview = await json(await api.get(`/renewals/preview?billingCycle=MONTHLY&startDate=2026-01-15&nextRenewalDate=${inTwoDays}&reminderDays=7,3,1`), 200);
    expect(preview.nextRenewalDate).toBe(inTwoDays);
    expect(preview.sendTime).toBe('09:00');
    expect(preview.timeZone).toBe('Asia/Kolkata');
    const byDays = Object.fromEntries(preview.reminders.map((reminder) => [reminder.daysBefore, reminder.willSend]));
    expect(byDays).toEqual({ 7: false, 3: false, 1: true });
  });

  test('the preview refuses a next renewal before the start date and an unknown cycle', async ({ request }) => {
    const api = await newUser(request);
    await failure(await api.get('/renewals/preview?billingCycle=MONTHLY&startDate=2026-05-01&nextRenewalDate=2026-04-01'), 400, 'VALIDATION_FAILED');
    expect((await api.get('/renewals/preview?billingCycle=DAILY&startDate=2026-05-01')).status()).toBe(400);
  });
});
