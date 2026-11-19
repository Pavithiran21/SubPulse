package com.subpulse.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Component;

import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;

/**
 * Fails fast when a variable in backend/.env is missing or unsafe. The message lists variable
 * names only: Spring's own binding errors would print the rejected value, which may be a secret.
 */
@Component
public class StartupConfigCheck {

    private static final Set<String> ENVIRONMENTS = Set.of("development", "test", "production");
    private static final int MIN_SECRET_LENGTH = 32;

    public StartupConfigCheck(AppProperties props) {
        List<String> problems = new ArrayList<>();

        if (!ENVIRONMENTS.contains(props.env())) {
            problems.add("APP_ENV (development, test or production)");
        }
        if (isTooShort(props.jwtSecret())) {
            problems.add("JWT_SECRET (at least " + MIN_SECRET_LENGTH + " characters)");
        }
        if (isTooShort(props.jobTriggerSecret())) {
            problems.add("JOB_TRIGGER_SECRET (at least " + MIN_SECRET_LENGTH + " characters)");
        }
        if (props.frontendUrl() == null || !props.frontendUrl().startsWith("http")) {
            problems.add("FRONTEND_URL (for example http://localhost:5173)");
        }
        if (!isOneAddress(props.mailFrom())) {
            problems.add("SMTP_FROM (one address such as SubPulse <you@example.com>, without quotes)");
        }
        if (props.demoMode() && (props.demoPassword() == null || props.demoPassword().length() < 8)) {
            problems.add("DEMO_PASSWORD (at least 8 characters when DEMO_MODE=true)");
        }
        if (props.demoMode() && (props.demoSmtp() == null || !props.demoSmtp().isConfigured())) {
            problems.add("DEMO_SMTP_HOST, DEMO_SMTP_USER and DEMO_SMTP_PASS (the demo Ethereal inbox, needed when DEMO_MODE=true)");
        }
        if (props.isProduction() && !props.rateLimitsEnabled()) {
            problems.add("RATE_LIMITS_ENABLED (can't be false in production)");
        }
        if (props.isProduction() && props.jobTimeOverrideEnabled()) {
            problems.add("JOB_TIME_OVERRIDE_ENABLED (can't be true in production)");
        }

        if (!problems.isEmpty()) {
            throw new IllegalStateException("Fix these variables in backend/.env: " + String.join(", ", problems));
        }
    }

    private static boolean isTooShort(String secret) {
        return secret == null || secret.length() < MIN_SECRET_LENGTH;
    }

    /**
     * .env is read as a properties file, so quotes are not removed as dotenv would: a value written
     * as "SubPulse <you@example.com>" keeps its quotes, and every SMTP server refuses that sender.
     */
    private static boolean isOneAddress(String from) {
        if (from == null || from.isBlank()) {
            return false;
        }
        try {
            new InternetAddress(from, true).validate();
            return true;
        } catch (AddressException ex) {
            return false;
        }
    }
}
