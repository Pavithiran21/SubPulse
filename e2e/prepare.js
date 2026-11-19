/**
 * Gets subpulse_test ready for a Playwright run:
 *   1. make-env.js            -> SubPulse/.env.test
 *   2. CREATE DATABASE IF NOT EXISTS subpulse_test (only that name; Flyway makes the tables)
 *   3. mvnw package            -> backend/target/subpulse-backend.jar (skipped with --no-build)
 *   4. the seed-test profile   -> empties subpulse_test, then user@ and demo@test.subpulse.test
 *                                 (SeedTestRunner); every other test registers its own user
 *
 * Usage: npm test (runs this, then playwright test), or node prepare.js [--no-build].
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const envFile = path.join(root, '.env.test');
const jar = path.join(backend, 'target', 'subpulse-backend.jar');

async function main() {
  execFileSync(process.execPath, [path.join(__dirname, 'make-env.js')], { stdio: 'inherit' });
  const env = require('node:util').parseEnv(fs.readFileSync(envFile, 'utf8'));
  if (env.DB_NAME !== 'subpulse_test') throw new Error('make-env must write DB_NAME=subpulse_test');

  const connection = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASSWORD });
  await connection.query('CREATE DATABASE IF NOT EXISTS `subpulse_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
  await connection.end();

  if (!process.argv.includes('--no-build')) {
    const mvnw = path.join(backend, process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw');
    execFileSync(process.platform === 'win32' ? `"${mvnw}"` : mvnw, ['-q', '-DskipTests', 'package'], {
      cwd: backend,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  }
  execFileSync('java', ['-jar', jar, '--spring.profiles.active=seed-test', '--spring.main.web-application-type=none'], {
    cwd: backend,
    env: { ...process.env, ENV_FILE: envFile },
    stdio: 'inherit',
  });

  console.log('Ready: run "npx playwright test".');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
