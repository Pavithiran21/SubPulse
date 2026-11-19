const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

// The run's settings come from SubPulse/.env.test, written by prepare.js (make-env.js). The backend
// reads the same file (ENV_FILE), so tests and server agree on the database, inboxes and passwords.
const envFile = path.resolve(__dirname, '../.env.test');
process.loadEnvFile(envFile);

// Ports of their own, so a run never talks to the development servers on 4000 and 5173.
const API_PORT = 4100;
const WEB_PORT = 5273;
process.env.E2E_API_URL = `http://127.0.0.1:${API_PORT}/api`;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: 'api/**/*.spec.js' },
    { name: 'ui', testMatch: 'ui/**/*.spec.js', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // A reminder-job run looks at every user's subscriptions and moves passed renewals forward, so these
    // tests wait until all the others are done and then run one at a time (the spec file is serial).
    { name: 'jobs', testMatch: 'jobs/**/*.spec.js', dependencies: ['api', 'ui'] },
  ],
  webServer: [
    {
      command: 'java -jar target/subpulse-backend.jar',
      cwd: path.resolve(__dirname, '../backend'),
      env: { ENV_FILE: envFile, PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: path.resolve(__dirname, '../frontend'),
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
