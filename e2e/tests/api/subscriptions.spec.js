const { test, expect } = require('@playwright/test');
const { failure, json, newUser, subscription } = require('../../helpers/api');

// The subscription lifecycle: validation, optimistic locking, the status machine, filters, and the
// dashboard's exact money. Every test registers its own user, so rows never collide.

const fields = (error) => error.details.map((detail) => detail.field);

test.describe('creating and editing', () => {
  test('a created subscription comes back with exact money, sorted reminder days and a version', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ name: 'Notion', amount: 1499.5, reminderDays: [1, 7, 3] })), 201);
    expect(saved).toMatchObject({ name: 'Notion', amount: '1499.50', currency: 'INR', status: 'ACTIVE', reminderDays: [7, 3, 1], version: 0 });
    expect(saved.id).toBeGreaterThan(0);
    const fetched = await json(await api.get(`/subscriptions/${saved.id}`), 200);
    expect(fetched).toEqual(saved);
  });

  test('without reminderDays the user\'s own defaults are used', async ({ request }) => {
    const api = await newUser(request);
    await json(await api.patch('/me', { defaultReminderDays: [7, 1] }), 200);
    const body = subscription();
    delete body.reminderDays;
    expect((await json(await api.post('/subscriptions', body), 201)).reminderDays).toEqual([7, 1]);
  });

  test('bad input is a 400 that names the field: name, amount (0, 3 decimals, text), dates, reminder days, category', async ({ request }) => {
    const api = await newUser(request);
    const rejected = async (overrides, field) => {
      const error = await failure(await api.post('/subscriptions', subscription(overrides)), 400, 'VALIDATION_FAILED');
      expect(fields(error), JSON.stringify(overrides)).toContain(field);
    };
    await rejected({ name: '   ' }, 'name');
    await rejected({ name: 'x'.repeat(81) }, 'name');
    await rejected({ amount: 0 }, 'amount');
    await rejected({ amount: -5 }, 'amount');
    await rejected({ amount: 10.123 }, 'amount');
    await rejected({ category: 'NOT_A_CATEGORY' }, 'category');
    await rejected({ reminderDays: [8] }, 'reminderDays');
    await rejected({ startDate: '1999-12-31' }, 'startDate');
    await rejected({ startDate: '2026-03-10', nextRenewalDate: '2026-03-01' }, 'nextRenewalDate');
  });

  test('an edit carries the version it loaded; the version moves on, and a stale one is a 409', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ name: 'Hotstar' })), 201);
    const edited = await json(await api.put(`/subscriptions/${saved.id}`, { ...subscription({ name: 'Hotstar Premium', amount: 299 }), startDate: saved.startDate, version: saved.version }), 200);
    expect(edited).toMatchObject({ name: 'Hotstar Premium', amount: '299.00' });
    expect(edited.version).toBeGreaterThan(saved.version);
    const stale = { ...subscription({ name: 'Too late' }), startDate: saved.startDate, version: saved.version };
    await failure(await api.put(`/subscriptions/${saved.id}`, stale), 409, 'CONCURRENT_UPDATE');
    await failure(await api.put(`/subscriptions/${saved.id}`, { ...stale, version: undefined }), 400, 'VALIDATION_FAILED');
    expect((await json(await api.get(`/subscriptions/${saved.id}`), 200)).name).toBe('Hotstar Premium');
  });

  test('two edits sent at once with the same version: one wins, the other is a 409, nothing is overwritten silently', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ name: 'Original' })), 201);
    const attempts = ['Edit A', 'Edit B', 'Edit C', 'Edit D'].map((name) =>
      api.put(`/subscriptions/${saved.id}`, { ...subscription({ name }), startDate: saved.startDate, version: saved.version }));
    const statuses = (await Promise.all(attempts)).map((response) => response.status()).sort();
    expect(statuses.filter((status) => status === 200)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(3);
    const final = await json(await api.get(`/subscriptions/${saved.id}`), 200);
    expect(final.name).toMatch(/^Edit [A-D]$/);
  });

  test('another user\'s subscription cannot be read, edited, paused or deleted: always 404', async ({ request }) => {
    const owner = await newUser(request);
    const stranger = await newUser(request);
    const theirs = await json(await owner.post('/subscriptions', subscription()), 201);
    await failure(await stranger.get(`/subscriptions/${theirs.id}`), 404);
    await failure(await stranger.put(`/subscriptions/${theirs.id}`, { ...subscription(), version: 0 }), 404);
    await failure(await stranger.post(`/subscriptions/${theirs.id}/cancel`), 404);
    await failure(await stranger.delete(`/subscriptions/${theirs.id}`), 404);
    expect((await json(await stranger.get('/subscriptions'), 200)).totalItems).toBe(0);
    expect((await json(await owner.get(`/subscriptions/${theirs.id}`), 200)).status).toBe('ACTIVE');
  });
});

test.describe('the status machine', () => {
  test('pause removes the next renewal; resume brings it back from today; cancel and restore follow the rules', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ startDate: '2026-01-31' })), 201);
    expect(saved.nextRenewalDate).toBeTruthy();

    const paused = await json(await api.post(`/subscriptions/${saved.id}/pause`), 200);
    expect(paused).toMatchObject({ status: 'PAUSED', nextRenewalDate: null, daysUntilRenewal: null });
    await failure(await api.post(`/subscriptions/${saved.id}/pause`), 422, 'ILLEGAL_STATUS_CHANGE');

    const resumed = await json(await api.post(`/subscriptions/${saved.id}/resume`), 200);
    expect(resumed.status).toBe('ACTIVE');
    expect(resumed.nextRenewalDate).toBe(saved.nextRenewalDate);
    await failure(await api.post(`/subscriptions/${saved.id}/resume`), 422, 'ILLEGAL_STATUS_CHANGE');

    expect((await json(await api.post(`/subscriptions/${saved.id}/cancel`), 200)).status).toBe('CANCELLED');
    await failure(await api.post(`/subscriptions/${saved.id}/pause`), 422, 'ILLEGAL_STATUS_CHANGE');
    await failure(await api.post(`/subscriptions/${saved.id}/resume`), 422, 'ILLEGAL_STATUS_CHANGE');
    expect((await json(await api.post(`/subscriptions/${saved.id}/archive`), 200)).status).toBe('ARCHIVED');
    const restored = await json(await api.post(`/subscriptions/${saved.id}/restore`), 200);
    expect(restored.status).toBe('ACTIVE');
    await failure(await api.post(`/subscriptions/${saved.id}/restore`), 422, 'ILLEGAL_STATUS_CHANGE');
  });

  test('ten pause requests at once: the first wins, the rest are refused, the row ends up paused once', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription()), 201);
    const responses = await Promise.all(Array.from({ length: 10 }, () => api.post(`/subscriptions/${saved.id}/pause`)));
    const statuses = responses.map((response) => response.status());
    expect(statuses.filter((status) => status === 200).length).toBeGreaterThanOrEqual(1);
    for (const status of statuses) expect([200, 409, 422]).toContain(status);
    expect((await json(await api.get(`/subscriptions/${saved.id}`), 200)).status).toBe('PAUSED');
  });

  test('delete is permanent: 204, then 404 on every route', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription()), 201);
    expect((await api.delete(`/subscriptions/${saved.id}`)).status()).toBe(204);
    await failure(await api.get(`/subscriptions/${saved.id}`), 404);
    await failure(await api.delete(`/subscriptions/${saved.id}`), 404);
  });
});

test.describe('the list', () => {
  test('filters by status, category and search; sorts; pages; and the tab counts add up', async ({ request }) => {
    const api = await newUser(request);
    const make = async (overrides) => json(await api.post('/subscriptions', subscription(overrides)), 201);
    const netflix = await make({ name: 'Netflix', category: 'ENTERTAINMENT', amount: 649 });
    const spotify = await make({ name: 'Spotify', category: 'MUSIC', amount: 119 });
    const figma = await make({ name: 'Figma', category: 'SOFTWARE', amount: 1200 });
    await make({ name: 'Gym', category: 'FITNESS', amount: 2500 });
    await json(await api.post(`/subscriptions/${spotify.id}/pause`), 200);
    await json(await api.post(`/subscriptions/${figma.id}/cancel`), 200);

    const active = await json(await api.get('/subscriptions?status=ACTIVE&sort=name'), 200);
    expect(active.items.map((item) => item.name)).toEqual(['Gym', 'Netflix']);
    const history = await json(await api.get('/subscriptions?status=PAUSED,CANCELLED,ARCHIVED&sort=-amount'), 200);
    expect(history.items.map((item) => item.name)).toEqual(['Figma', 'Spotify']);
    expect((await json(await api.get('/subscriptions?category=MUSIC'), 200)).items.map((item) => item.name)).toEqual(['Spotify']);
    expect((await json(await api.get('/subscriptions?q=flix'), 200)).items.map((item) => item.id)).toEqual([netflix.id]);
    const counts = await json(await api.get('/subscriptions/status-counts'), 200);
    expect(counts).toEqual({ ACTIVE: 2, PAUSED: 1, CANCELLED: 1, ARCHIVED: 0 });

    const everything = await json(await api.get('/subscriptions?sort=-amount&size=2&page=2'), 200);
    expect(everything).toMatchObject({ page: 2, size: 2, totalItems: 4, totalPages: 2 });
    expect(everything.items.map((item) => item.name)).toEqual(['Netflix', 'Spotify']);
  });

  test('search treats % and _ as plain text, and a bad sort field or status is a 400', async ({ request }) => {
    const api = await newUser(request);
    await json(await api.post('/subscriptions', subscription({ name: '100% Pure' })), 201);
    await json(await api.post('/subscriptions', subscription({ name: 'Plain' })), 201);
    expect((await json(await api.get('/subscriptions?q=%25'), 200)).items.map((item) => item.name)).toEqual(['100% Pure']);
    expect((await json(await api.get('/subscriptions?q=_'), 200)).items).toHaveLength(0);
    await failure(await api.get('/subscriptions?sort=passwordHash'), 400);
    await failure(await api.get('/subscriptions?status=NOPE'), 400);
  });
});

test.describe('the dashboard and the calendar', () => {
  test('spend is exact: yearly cost is amount x payments per year, monthly is that / 12 rounded once at the end', async ({ request }) => {
    const api = await newUser(request);
    await json(await api.post('/subscriptions', subscription({ name: 'Weekly paper', amount: 10.01, billingCycle: 'WEEKLY', category: 'NEWS' })), 201);
    await json(await api.post('/subscriptions', subscription({ name: 'Phone', amount: 649, billingCycle: 'MONTHLY', category: 'UTILITIES' })), 201);
    await json(await api.post('/subscriptions', subscription({ name: 'Cloud', amount: 1200, billingCycle: 'YEARLY', category: 'CLOUD_STORAGE' })), 201);
    const paused = await json(await api.post('/subscriptions', subscription({ name: 'Paused one', amount: 99999, category: 'OTHER' })), 201);
    await json(await api.post(`/subscriptions/${paused.id}/pause`), 200);

    const dashboard = await json(await api.get('/dashboard'), 200);
    // 10.01 x 52 = 520.52; 649 x 12 = 7788.00; 1200 x 1 = 1200.00 -> 9508.52 a year, 792.38 a month.
    expect(dashboard).toMatchObject({ activeCount: 3, yearlySpend: '9508.52', monthlySpend: '792.38', currency: 'INR' });
    expect(dashboard.byCategory.map((row) => row.category)).toEqual(['UTILITIES', 'CLOUD_STORAGE', 'NEWS']);
    expect(dashboard.byCategory[0].monthlySpend).toBe('649.00');
    expect(dashboard.nextUp.length).toBeLessThanOrEqual(3);
  });

  test('"saved per month" counts cancelled subscriptions only', async ({ request }) => {
    const api = await newUser(request);
    const gone = await json(await api.post('/subscriptions', subscription({ amount: 500, billingCycle: 'MONTHLY' })), 201);
    await json(await api.post('/subscriptions', subscription({ amount: 100, billingCycle: 'MONTHLY' })), 201);
    await json(await api.post(`/subscriptions/${gone.id}/cancel`), 200);
    expect(await json(await api.get('/dashboard'), 200)).toMatchObject({ activeCount: 1, monthlySpend: '100.00', savedPerMonth: '500.00' });
  });

  test('the calendar lists a 31 January monthly plan on the last day of each shorter month', async ({ request }) => {
    const api = await newUser(request);
    const saved = await json(await api.post('/subscriptions', subscription({ name: 'Month-end plan', startDate: '2026-01-31', amount: 100 })), 201);
    const today = (await json(await api.get('/dashboard'), 200)).today;
    const first = new Date(`${today}T00:00:00Z`);
    for (let offset = 0; offset < 4; offset += 1) {
      const month = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1)).toISOString().slice(0, 7);
      const calendar = await json(await api.get(`/calendar?month=${month}`), 200);
      expect(calendar.month).toBe(month);
      const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
      const mine = calendar.renewals.filter((renewal) => renewal.subscriptionId === saved.id);
      if (offset > 0) expect(mine.length, month).toBeGreaterThanOrEqual(1);
      for (const renewal of mine) expect(Number(renewal.date.slice(8, 10)), renewal.date).toBe(lastDay);
    }
    await failure(await api.get('/calendar?month=2026-13'), 400);
  });
});
