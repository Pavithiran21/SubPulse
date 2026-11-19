package com.subpulse.seed;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.subpulse.demo.DemoService;
import com.subpulse.subscription.BillingCycle;
import com.subpulse.subscription.Category;
import com.subpulse.subscription.StatusAction;
import com.subpulse.user.SupportedCurrency;

/**
 * seed:demo. Creates the demo account behind "Log in as User" (user@demo.subpulse.test, password
 * DEMO_PASSWORD, is_demo set) with realistic subscriptions. Renewal dates are set relative to today
 * in the account's zone, so the calendar is full whatever day the demo runs:
 * - Netflix renews in 3 days (the tinted day, and the "renews in 3 days" email of the demo) and
 *   Google One tomorrow;
 * - iCloud+ started on 31 January and the domain on 29 February 2024, to show month-end dates;
 * - weekly, monthly, quarterly and yearly plans, and one each paused, cancelled and archived.
 *
 * Run by scripts/demo-up.ps1 on the empty "subpulse_demo", and by scripts/seed-dev.ps1 on the dev
 * database "subpulse", where it replaces only the demo account and leaves every other user alone.
 * It refuses any other database.
 */
@Component
@Profile("seed-demo")
public class SeedDemoRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedDemoRunner.class);
    private static final String DEMO_DATABASE = "subpulse_demo";
    private static final String DEV_DATABASE = "subpulse";
    private static final String TIME_ZONE = "Asia/Kolkata";

    private final SeedSupport seed;

    public SeedDemoRunner(SeedSupport seed) {
        this.seed = seed;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed.runAndExit("Demo seed", this::seed, log);
    }

    private void seed() {
        seed.requireDatabase("seed-demo", DEMO_DATABASE, DEV_DATABASE);
        Long userId = seed.recreateUser("Kavya Rao", DemoService.USER_EMAIL, TIME_ZONE, SupportedCurrency.INR, true).getId();
        LocalDate today = seed.today(TIME_ZONE);

        LocalDate netflix = today.plusDays(3);
        seed.add(userId, "Netflix Premium", Category.ENTERTAINMENT, "649.00", BillingCycle.MONTHLY,
                netflix.minusMonths(14), netflix, "HDFC card");
        LocalDate googleOne = today.plusDays(1);
        seed.add(userId, "Google One", Category.CLOUD_STORAGE, "130.00", BillingCycle.MONTHLY,
                googleOne.minusMonths(10), googleOne, "HDFC card");
        LocalDate hindu = today.plusDays(5);
        seed.add(userId, "The Hindu ePaper", Category.NEWS, "49.00", BillingCycle.WEEKLY,
                hindu.minusWeeks(10), hindu, "UPI");
        LocalDate spotify = today.plusDays(9);
        seed.add(userId, "Spotify Premium", Category.MUSIC, "119.00", BillingCycle.MONTHLY,
                spotify.minusMonths(19), spotify, "UPI");
        LocalDate notion = today.plusDays(14);
        seed.add(userId, "Notion", Category.SOFTWARE, "400.00", BillingCycle.MONTHLY,
                notion.minusMonths(11), notion, "Amex");
        LocalDate cult = today.plusDays(20);
        seed.add(userId, "Cult.fit", Category.FITNESS, "2199.00", BillingCycle.QUARTERLY,
                cult.minusMonths(9), cult, "UPI");
        LocalDate prime = today.plusDays(45);
        seed.add(userId, "Prime Video", Category.ENTERTAINMENT, "1499.00", BillingCycle.YEARLY,
                prime.minusYears(2), prime, "HDFC card");
        LocalDate duolingo = today.plusDays(120);
        seed.add(userId, "Duolingo Super", Category.EDUCATION, "3099.00", BillingCycle.YEARLY,
                duolingo.minusYears(1), duolingo, "UPI");
        seed.add(userId, "iCloud+", Category.CLOUD_STORAGE, "219.00", BillingCycle.MONTHLY,
                LocalDate.parse("2026-01-31"), null, "UPI");
        seed.add(userId, "Domain renewal", Category.UTILITIES, "899.00", BillingCycle.YEARLY,
                LocalDate.parse("2024-02-29"), null, "Amex");

        Long youtube = seed.add(userId, "YouTube Premium", Category.ENTERTAINMENT, "149.00", BillingCycle.MONTHLY,
                today.minusMonths(18), null, "UPI");
        seed.changeStatus(userId, youtube, StatusAction.CANCEL);
        Long gym = seed.add(userId, "Gold's Gym", Category.FITNESS, "1500.00", BillingCycle.MONTHLY,
                today.minusMonths(21), null, "HDFC card");
        seed.changeStatus(userId, gym, StatusAction.PAUSE);
        Long lightroom = seed.add(userId, "Adobe Lightroom", Category.SOFTWARE, "799.00", BillingCycle.MONTHLY,
                today.minusMonths(26), null, "Amex");
        seed.changeStatus(userId, lightroom, StatusAction.ARCHIVE);

        log.info("Demo seed done: {} with 13 subscriptions (10 active, 1 cancelled, 1 paused, 1 archived)",
                DemoService.USER_EMAIL);
    }
}
