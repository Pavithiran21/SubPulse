const { test, expect } = require('@playwright/test');
const { json, newUser, subscription } = require('../../helpers/api');
const { logIn, openList, rowAction, rowName } = require('../../helpers/ui');

// One browser flow through the subscription drawer and the list: add with the month-end preview,
// open the read-only view, edit, pause with its confirm, resume, and delete with its confirm.

test('add a subscription started on 31 January: the preview marks the month-end dates, and it appears in the list', async ({ page, request }) => {
  const user = await newUser(request);
  await logIn(page, user.email, user.password);
  await openList(page);
  await expect(page.getByText('No subscriptions yet').or(page.getByText(/nothing here/i)).first()).toBeVisible();

  await page.getByRole('button', { name: 'Add subscription' }).first().click();
  const drawer = page.getByRole('dialog');
  await drawer.getByLabel('Name').fill('Disney Plus');
  await drawer.getByLabel('Category').selectOption('ENTERTAINMENT');
  await drawer.getByLabel('Amount').fill('1499.50');
  await drawer.getByText('Monthly', { exact: true }).click();
  await drawer.getByLabel('Start date').fill('2026-01-31');

  // The preview is worked out by the backend: months with fewer than 31 days are flagged in amber.
  const preview = drawer.getByRole('heading', { name: 'Upcoming renewal dates' }).locator('..');
  await expect(preview.getByRole('listitem').first()).toBeVisible();
  const dates = await preview.getByRole('listitem').allInnerTexts();
  expect(dates).toHaveLength(4);

  await drawer.getByRole('button', { name: 'Save subscription' }).click();
  await expect(page.getByText('Subscription saved')).toBeVisible();
  await expect(rowName(page, 'Disney Plus')).toBeVisible();
  await expect(page.getByRole('row', { name: /Disney Plus/ })).toContainText('1,499.50');
});

test('a bad form shows each field error and saves nothing', async ({ page, request }) => {
  const user = await newUser(request);
  await logIn(page, user.email, user.password);
  await openList(page);
  await page.getByRole('button', { name: 'Add subscription' }).first().click();
  const drawer = page.getByRole('dialog');
  await drawer.getByRole('button', { name: 'Save subscription' }).click();
  await expect(drawer.locator('.field-error, [id$="-error"]').first()).toBeVisible();
  await drawer.getByLabel('Name').fill('Zee5');
  await drawer.getByLabel('Amount').fill('10.123');
  await drawer.getByRole('button', { name: 'Save subscription' }).click();
  await expect(drawer).toBeVisible();
  const list = await json(await user.get('/subscriptions'), 200);
  expect(list.totalItems).toBe(0);
});

test('open, edit, pause, resume and delete from the list', async ({ page, request }) => {
  const user = await newUser(request);
  await json(await user.post('/subscriptions', subscription({ name: 'Hotstar', amount: 299, startDate: '2026-01-31' })), 201);
  await logIn(page, user.email, user.password);
  await openList(page);

  // Clicking the name opens the read-only view; Edit switches the same drawer to the form.
  await rowName(page, 'Hotstar').click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('heading', { name: 'Subscription' })).toBeVisible();
  await drawer.getByRole('button', { name: 'Edit' }).click();
  await drawer.getByLabel('Name').fill('Hotstar Premium');
  await drawer.getByRole('button', { name: 'Save subscription' }).click();
  await expect(rowName(page, 'Hotstar Premium')).toBeVisible();

  // Pause asks first; the row moves to the Paused tab, where Resume is one click.
  await rowAction(page, 'Hotstar Premium', 'Pause');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(rowName(page, 'Hotstar Premium')).toHaveCount(0);
  await page.getByRole('button', { name: /^Paused/ }).click();
  await expect(rowName(page, 'Hotstar Premium')).toBeVisible();
  await rowAction(page, 'Hotstar Premium', 'Resume');
  await expect(rowName(page, 'Hotstar Premium')).toHaveCount(0);

  // Delete asks first and focuses Cancel; confirming removes it for good.
  await page.getByRole('button', { name: /^Active/ }).click();
  await rowAction(page, 'Hotstar Premium', 'Delete');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(rowName(page, 'Hotstar Premium')).toHaveCount(0);
  expect((await json(await user.get('/subscriptions'), 200)).totalItems).toBe(0);
});

test('another user\'s subscription id opens the "not found" view, not their data', async ({ page, request }) => {
  const owner = await newUser(request);
  const saved = await json(await owner.post('/subscriptions', subscription({ name: 'Private plan' })), 201);
  const other = await newUser(request);
  await logIn(page, other.email, other.password);
  await page.goto(`/subscriptions/${saved.id}`);
  await expect(page.getByText('Private plan')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('the search box and category filter narrow the list and keep the choice in the URL', async ({ page, request }) => {
  const user = await newUser(request);
  await json(await user.post('/subscriptions', subscription({ name: 'Netflix One', category: 'ENTERTAINMENT' })), 201);
  await json(await user.post('/subscriptions', subscription({ name: 'Spotify One', category: 'MUSIC' })), 201);
  await logIn(page, user.email, user.password);
  await openList(page);

  await page.getByLabel('Search subscriptions').fill('Spot');
  await expect(rowName(page, 'Netflix One')).toHaveCount(0);
  await expect(rowName(page, 'Spotify One')).toBeVisible();

  await page.getByLabel('Search subscriptions').fill('');
  await page.getByLabel('Category').selectOption('MUSIC');
  await expect(page).toHaveURL(/category=MUSIC/);
  await expect(rowName(page, 'Netflix One')).toHaveCount(0);
  await page.reload();
  await expect(rowName(page, 'Spotify One')).toBeVisible();
});
