package com.subpulse.seed;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.subpulse.subscription.BillingCycle;
import com.subpulse.subscription.Category;
import com.subpulse.user.SupportedCurrency;
import com.subpulse.user.User;

/**
 * Users for the Playwright tests that public registration can't create (password DEMO_PASSWORD):
 * - user@test.subpulse.test: a normal User with three subscriptions, for the log-in tests and as
 *   "someone else" whose subscriptions another user must not reach. Reminder emails are off, so the
 *   reminder-job tests never email it.
 * - demo@test.subpulse.test: a demo-flagged User, for the "demo accounts can't change the password
 *   or be deleted" and "demo accounts get no reset email" tests.
 *
 * Run by scripts/e2e.ps1 (or by hand: scripts/seed.ps1 -Seed test). Every other test registers its own
 * user. It refuses any database other than "subpulse_test".
 */
@Component
@Profile("seed-test")
public class SeedTestRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedTestRunner.class);
    private static final String TEST_DATABASE = "subpulse_test";

    private final SeedSupport seed;

    public SeedTestRunner(SeedSupport seed) {
        this.seed = seed;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed.runAndExit("Test seed", this::seed, log);
    }

    private void seed() {
        seed.requireDatabase("seed-test", TEST_DATABASE);

        User user = seed.recreateUser("Priya Nair", "user@test.subpulse.test", "Asia/Kolkata", SupportedCurrency.INR, false);
        user.setRemindersEnabled(false);
        Long userId = seed.save(user).getId();
        seed.add(userId, "Netflix Premium", Category.ENTERTAINMENT, "649.00", BillingCycle.MONTHLY,
                LocalDate.parse("2025-06-20"), null, "HDFC card");
        seed.add(userId, "Spotify Premium", Category.MUSIC, "119.00", BillingCycle.MONTHLY,
                LocalDate.parse("2025-03-26"), null, "UPI");
        seed.add(userId, "Notion", Category.SOFTWARE, "400.00", BillingCycle.MONTHLY,
                LocalDate.parse("2025-11-09"), null, "Amex");

        seed.recreateUser("Demo Tester", "demo@test.subpulse.test", "Asia/Kolkata", SupportedCurrency.INR, true);

        // The account behind "Log in as User" (DEMO_MODE=true), so the demo log-in can be tested. Its address is on
        // the reserved demo domain, so its mail goes to the demo inbox. Reminders are off, as for the others.
        User demo = seed.recreateUser("Aarav Mehta", "user@demo.subpulse.test", "Asia/Kolkata", SupportedCurrency.INR, true);
        demo.setRemindersEnabled(false);
        Long demoId = seed.save(demo).getId();
        seed.add(demoId, "iCloud+", Category.CLOUD_STORAGE, "219.00", BillingCycle.MONTHLY,
                LocalDate.parse("2025-01-31"), null, "UPI");

        log.info("Test seed done: user@test.subpulse.test (3 subscriptions), demo@test.subpulse.test (demo) "
                + "and user@demo.subpulse.test (demo log-in, 1 subscription)");
    }
}
