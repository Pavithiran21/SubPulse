const { randomBytes } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { newUser } = require('../../helpers/api');
const { logIn, openList, rowName } = require('../../helpers/ui');

// The browser side of accounts: sign-up, log-in errors, the signed-out redirect that remembers the
// page, log-out, and the one-click demo account on the Log in page.

test('a signed-out visitor is sent to Log in, and after logging in lands on the page they asked for', async ({ page, request }) => {
  const user = await newUser(request);
  await page.goto('/subscriptions');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL(/\/subscriptions$/);
  await expect(page.getByRole('region', { name: 'Subscriptions' })).toBeVisible();
});

test('a wrong password shows one message that does not say which half was wrong', async ({ page, request }) => {
  const user = await newUser(request);
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Not-the-password-1');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: "That email or password doesn't match" })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('create account in the browser opens an empty calendar; log out returns to Log in', async ({ page }) => {
  const email = `ui.${randomBytes(5).toString('hex')}@e2e.subpulse.test`;
  await page.goto('/register');
  await page.getByLabel('Name').fill('Meera Nair');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(`Pw-${randomBytes(6).toString('hex')}-1`);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByText('Your calendar is empty')).toBeVisible();

  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/subscriptions');
  await expect(page).toHaveURL(/\/login$/);
});

test('the demo account logs in with one click and shows the sample subscriptions; no password or inbox login is on the page', async ({ page }) => {
  await page.goto('/login');
  const demo = page.getByRole('region', { name: 'Demo' });
  await expect(demo).toBeVisible();
  await expect(page.getByLabel('User account')).toContainText('user@demo.subpulse.test');
  await expect(demo).not.toContainText(process.env.DEMO_PASSWORD);
  if (process.env.DEMO_SMTP_USER) await expect(demo).not.toContainText(process.env.DEMO_SMTP_USER);
  await expect(demo).not.toContainText(/ethereal|inbox/i);
  await page.getByRole('button', { name: /Log in as User/ }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await openList(page);
  await expect(rowName(page, 'iCloud+')).toBeVisible();
});

test('the seeded account logs in and sees only its own data', async ({ page }) => {
  await logIn(page, 'user@test.subpulse.test', process.env.DEMO_PASSWORD);
  await openList(page);
  await expect(rowName(page, 'Netflix Premium')).toBeVisible();
  await expect(page.getByText('iCloud+')).toHaveCount(0);
});
