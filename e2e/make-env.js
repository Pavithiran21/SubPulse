/**
 * Writes SubPulse/.env.test (git-ignored) for a Playwright run, copied from backend/.env with:
 *   - DB_NAME=subpulse_test (same MySQL server and login), FRONTEND_URL = the run's own frontend
 *   - a new JWT_SECRET and JOB_TRIGGER_SECRET
 *   - JOB_TIME_OVERRIDE_ENABLED=true (tests run the reminder job "as of" a chosen moment), rate limits off,
 *     DEMO_MODE=true and a new DEMO_PASSWORD (the seeded test users use it)
 *   - the reminder schedule off ("-"): tests run the job through its endpoint
 *   - two brand-new Ethereal inboxes (SMTP_* and DEMO_SMTP_*), so the run's mail starts empty and
 *     nothing is ever sent through Brevo
 * The file is read by Spring as a properties file, so no value is quoted.
 *
 * Usage: node make-env.js   (prepare.js runs it)
 */
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const sourceFile = path.join(projectRoot, 'backend', '.env');
const targetFile = path.join(projectRoot, '.env.test');

function setValue(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

/** A new Ethereal account from Nodemailer's public API (what nodemailer.createTestAccount calls). */
async function newEtherealAccount() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch('https://api.nodemailer.com/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestor: 'subpulse-e2e', version: '1.0.0' }),
        signal: AbortSignal.timeout(15000),
      });
      const account = await response.json();
      if (account.status !== 'success') throw new Error(account.error ?? 'Ethereal refused');
      return account;
    } catch (error) {
      if (attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function main() {
  if (!fs.existsSync(sourceFile)) throw new Error(`No .env at ${sourceFile}. See README.md.`);
  let text = fs.readFileSync(sourceFile, 'utf8');
  const values = {
    DB_NAME: 'subpulse_test',
    APP_ENV: 'development',
    // The run's own frontend (playwright.config.js). Spring's CORS allows only FRONTEND_URL, and the Vite
    // proxy rewrites Host, so the browser's origin must be this one (email links use it too).
    FRONTEND_URL: 'http://127.0.0.1:5273',
    LOG_LEVEL: 'WARN',
    JWT_SECRET: randomBytes(48).toString('base64url'),
    JOB_TRIGGER_SECRET: randomBytes(32).toString('base64url'),
    JOB_TIME_OVERRIDE_ENABLED: 'true',
    RATE_LIMITS_ENABLED: 'false',
    DEMO_MODE: 'true',
    REMINDER_CRON: '-',
    DEMO_PASSWORD: `Demo-${randomBytes(9).toString('base64url')}-1`,
  };
  for (const [key, value] of Object.entries(values)) text = setValue(text, key, value);

  const [main, demo] = [await newEtherealAccount(), await newEtherealAccount()];
  for (const [prefix, account] of [['SMTP', main], ['DEMO_SMTP', demo]]) {
    text = setValue(text, `${prefix}_HOST`, account.smtp.host);
    text = setValue(text, `${prefix}_PORT`, String(account.smtp.port));
    text = setValue(text, `${prefix}_USER`, account.user);
    text = setValue(text, `${prefix}_PASS`, account.pass);
  }
  fs.writeFileSync(targetFile, text);
  console.log(`Wrote .env.test: subpulse_test, new secrets, jobs off, new Ethereal inboxes ${main.user} and ${demo.user}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
