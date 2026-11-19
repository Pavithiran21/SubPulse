package com.subpulse.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Removes expired refresh tokens and old reset links once an hour. MySQL has no TTL index like
 * MongoDB, so this replaces WeatherPing's TTL indexes. Running it twice at once is harmless:
 * both just delete the same expired rows.
 */
@Component
public class TokenCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(TokenCleanupJob.class);

    private final RefreshTokenRepository refreshTokens;
    private final PasswordResetTokenRepository resetTokens;
    private final Clock clock;

    public TokenCleanupJob(RefreshTokenRepository refreshTokens, PasswordResetTokenRepository resetTokens, Clock clock) {
        this.refreshTokens = refreshTokens;
        this.resetTokens = resetTokens;
        this.clock = clock;
    }

    @Scheduled(cron = "0 5 * * * *", zone = "UTC")
    public void deleteExpiredTokens() {
        Instant now = clock.instant();
        int refresh = refreshTokens.deleteExpired(now);
        int reset = resetTokens.deleteExpiredBefore(now.minus(Duration.ofDays(1)));
        if (refresh + reset > 0) {
            log.info("Token clean-up removed {} refresh tokens and {} reset links", refresh, reset);
        }
    }
}
