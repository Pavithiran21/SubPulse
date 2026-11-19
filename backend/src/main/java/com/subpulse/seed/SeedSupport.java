package com.subpulse.seed;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;

import org.slf4j.Logger;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.subpulse.auth.AuthService;
import com.subpulse.config.AppProperties;
import com.subpulse.subscription.BillingCycle;
import com.subpulse.subscription.Category;
import com.subpulse.subscription.StatusAction;
import com.subpulse.subscription.SubscriptionDtos.SubscriptionRequest;
import com.subpulse.subscription.SubscriptionService;
import com.subpulse.user.SupportedCurrency;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/**
 * What the three seed runners (dev, test, demo) share: the database guard, recreating a user and
 * adding subscriptions through SubscriptionService, so seeded rows get exactly the same anchors and
 * next renewals as rows created through the API.
 */
@Component
@Profile({ "seed-dev", "seed-test", "seed-demo" })
public class SeedSupport {

    private static final Set<Integer> REMINDER_DAYS = Set.of(7, 3, 1);

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final SubscriptionService subscriptions;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;
    private final ApplicationContext context;
    private final Clock clock;

    public SeedSupport(JdbcTemplate jdbc, UserRepository users, SubscriptionService subscriptions,
            PasswordEncoder passwordEncoder, AppProperties props, ApplicationContext context, Clock clock) {
        this.jdbc = jdbc;
        this.users = users;
        this.subscriptions = subscriptions;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
        this.context = context;
        this.clock = clock;
    }

    /**
     * Runs a seed once and stops the app (and its scheduler threads) afterwards, with exit code 1
     * if the seed failed, so the calling script can stop too.
     */
    public void runAndExit(String what, Runnable seed, Logger log) {
        int exitCode = 0;
        try {
            seed.run();
        } catch (RuntimeException ex) {
            log.error("{} failed: {}", what, ex.getMessage());
            exitCode = 1;
        }
        int finalExitCode = exitCode;
        System.exit(SpringApplication.exit(context, () -> finalExitCode));
    }

    /** Refuses to seed any database other than the expected ones, so a seed can't touch the wrong data. */
    public void requireDatabase(String profile, String... expected) {
        String database = jdbc.queryForObject("SELECT DATABASE()", String.class);
        if (!Set.of(expected).contains(database)) {
            throw new IllegalStateException(profile + " only runs on " + String.join(" or ", expected)
                    + ", not '" + database + "'");
        }
        if (props.demoPassword() == null || props.demoPassword().length() < 8) {
            throw new IllegalStateException("Set DEMO_PASSWORD (at least 8 characters) in the env file");
        }
    }

    /** Deletes the user if it exists (its subscriptions go with it) and creates it again. Password: DEMO_PASSWORD. */
    public User recreateUser(String name, String email, String timeZone, SupportedCurrency currency, boolean demo) {
        users.findByEmail(email).ifPresent(users::delete);
        User user = new User(name, email, passwordEncoder.encode(props.demoPassword()), timeZone, currency,
                AuthService.DEFAULT_REMINDER_DAYS);
        user.setDemo(demo);
        return users.save(user);
    }

    public User save(User user) {
        return users.save(user);
    }

    /** Today in the given zone: seeds that use dates relative to today need the user's own day. */
    public LocalDate today(String timeZone) {
        return LocalDate.now(clock.withZone(ZoneId.of(timeZone)));
    }

    /** Adds a subscription with reminders 7, 3 and 1 days before. Without a next renewal, the first one on or after today is used. */
    public Long add(Long userId, String name, Category category, String amount, BillingCycle cycle, LocalDate startDate,
            LocalDate nextRenewalDate, String paidWith) {
        SubscriptionRequest request = new SubscriptionRequest(name, category, new BigDecimal(amount), cycle, startDate,
                nextRenewalDate, paidWith, null, REMINDER_DAYS, null);
        return subscriptions.create(userId, request).id();
    }

    public void changeStatus(Long userId, Long subscriptionId, StatusAction action) {
        subscriptions.changeStatus(userId, subscriptionId, action);
    }
}
