const { test, expect } = require('@playwright/test');
const { newUser } = require('../../helpers/api');
const { waitForMail } = require('../../helpers/mail');
const { logIn } = require('../../helpers/ui');

// The whole reset flow in the browser, with the real email read from the run's Ethereal inbox.
test('forgot password: the emailed link sets a new password that then logs in', async ({ page, request }) => {
  test.setTimeout(90_000);
  const user = await newUser(request);

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(user.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeEnabled();

  const mail = await waitForMail({ to: user.email, subject: /Reset your SubPulse password/ });
  const link = mail.html.match(/href="([^"]*\/reset-password\?token=[^"]+)"/)?.[1];
  expect(link, 'reset link in the email').toBeTruthy();
  // The link points at FRONTEND_URL; open the same path on this run's frontend.
  const { pathname, search } = new URL(link.replace(/&amp;/g, '&'));
  await page.goto(pathname + search);

  const newPassword = 'Fresh-password-42';
  await page.getByLabel('New password').fill(newPassword);
  await page.getByLabel('Confirm password').fill(newPassword);
  await page.getByRole('button', { name: 'Save password' }).click();

  // A reset ends every session and sends the person to Log in with a note; it does not log in.
  await expect(page).toHaveURL(/\/login$/);
  await logIn(page, user.email, newPassword);
});
