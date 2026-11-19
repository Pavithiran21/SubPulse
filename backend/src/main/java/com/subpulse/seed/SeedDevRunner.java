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
import com.subpulse.subscription.StatusAction;
import com.subpulse.user.SupportedCurrency;

/**
 * Development data: recreates dev@subpulse.test (password DEMO_PASSWORD) with subscriptions that
 * cover the tricky dates: a monthly one started on 31 January, a yearly one on 29 February, weekly
 * and quarterly ones, and one each paused, cancelled and archived.
 *
 * Run with scripts/seed-dev.ps1. It refuses to run on any database other than "subpulse", so it
 * can never touch the test or demo database.
 */
@Component
@Profile("seed-dev")
public class SeedDevRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDevRunner.class);
    private static final String DEV_DATABASE = "subpulse";
    private static final String DEV_EMAIL = "dev@subpulse.test";

    private final SeedSupport seed;

    public SeedDevRunner(SeedSupport seed) {
        this.seed = seed;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed.runAndExit("Dev seed", this::seed, log);
    }

    private void seed() {
        seed.requireDatabase("seed-dev", DEV_DATABASE);
        Long userId = seed.recreateUser("Arjun Mehta", DEV_EMAIL, "Asia/Kolkata", SupportedCurrency.INR, false).getId();

        add(userId, "Netflix Premium", Category.ENTERTAINMENT, "649.00", BillingCycle.MONTHLY, "2025-06-20", "HDFC card");
        add(userId, "Spotify Premium", Category.MUSIC, "119.00", BillingCycle.MONTHLY, "2025-03-26", "UPI");
        add(userId, "Cult.fit", Category.FITNESS, "2199.00", BillingCycle.QUARTERLY, "2026-01-24", "UPI");
        add(userId, "iCloud+", Category.CLOUD_STORAGE, "219.00", BillingCycle.MONTHLY, "2026-01-31", "UPI");
        add(userId, "Google One", Category.CLOUD_STORAGE, "130.00", BillingCycle.MONTHLY, "2025-09-03", "HDFC card");
        add(userId, "Notion", Category.SOFTWARE, "400.00", BillingCycle.MONTHLY, "2025-11-09", "Amex");
        add(userId, "Proton Mail Plus", Category.SOFTWARE, "349.00", BillingCycle.MONTHLY, "2026-01-31", "UPI");
        add(userId, "Prime Video", Category.ENTERTAINMENT, "1499.00", BillingCycle.YEARLY, "2024-11-06", "HDFC card");
        add(userId, "The Hindu ePaper", Category.NEWS, "49.00", BillingCycle.WEEKLY, "2026-08-03", "UPI");
        add(userId, "Domain renewal", Category.UTILITIES, "899.00", BillingCycle.YEARLY, "2024-02-29", "Amex");

        Long youtube = add(userId, "YouTube Premium", Category.ENTERTAINMENT, "149.00", BillingCycle.MONTHLY, "2025-04-02", "UPI");
        seed.changeStatus(userId, youtube, StatusAction.CANCEL);
        Long gym = add(userId, "Gold's Gym", Category.FITNESS, "1500.00", BillingCycle.MONTHLY, "2025-01-15", "HDFC card");
        seed.changeStatus(userId, gym, StatusAction.PAUSE);
        Long lightroom = add(userId, "Adobe Lightroom", Category.SOFTWARE, "799.00", BillingCycle.MONTHLY, "2024-08-20", "Amex");
        seed.changeStatus(userId, lightroom, StatusAction.ARCHIVE);

        log.info("Dev seed done: {} with 13 subscriptions (10 active, 1 cancelled, 1 paused, 1 archived)", DEV_EMAIL);
    }

    private Long add(Long userId, String name, Category category, String amount, BillingCycle cycle, String startDate,
            String paidWith) {
        return seed.add(userId, name, category, amount, cycle, LocalDate.parse(startDate), null, paidWith);
    }
}
