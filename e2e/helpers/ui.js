const { expect } = require('@playwright/test');

/** Logs in on /login and waits until the app shell (the Main navigation) is showing. */
async function logIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
}

/** Opens the row's "Actions for <name>" menu and picks an item. */
async function rowAction(page, name, item) {
  await page.getByRole('button', { name: `Actions for ${name}` }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

/** Opens the Subscriptions list directly (the top bar's link is hidden on small screens). */
async function openList(page) {
  await page.goto('/subscriptions');
  await expect(page.getByRole('region', { name: 'Subscriptions' })).toBeVisible();
}

/** The name button of a list row (the row's own "Actions for ..." button also contains the name). */
const rowName = (page, name) => page.getByRole('button', { name, exact: true });

module.exports = { logIn, rowAction, openList, rowName };
