package com.subpulse.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.common.error.ApiException;
import com.subpulse.mail.MailService;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/** "Forgot password" emails and the single-use, 30-minute reset links they contain. */
@Service
public class PasswordResetService {

    public static final Duration LINK_LIFETIME = Duration.ofMinutes(30);
    private static final Pattern TOKEN_FORMAT = Pattern.compile("^[A-Za-z0-9_-]{43}$");

    private final UserRepository users;
    private final PasswordResetTokenRepository resetTokens;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final Clock clock;

    public PasswordResetService(UserRepository users, PasswordResetTokenRepository resetTokens,
            RefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder, MailService mailService, Clock clock) {
        this.users = users;
        this.resetTokens = resetTokens;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.clock = clock;
    }

    /**
     * Runs after the 202 response has gone (@Async), so the response time is the same whether or
     * not the email has an account, and nobody can use it to find out who is registered.
     * Unknown emails and demo accounts get nothing.
     *
     * Not @Transactional on purpose: each repository call commits on its own, and the email is
     * sent after that, so no database lock is held while waiting for the SMTP server.
     */
    @Async
    public void sendResetLink(String rawEmail) {
        User user = users.findByEmail(AuthService.normalizeEmail(rawEmail)).orElse(null);
        if (user == null || user.isDemo()) {
            return;
        }
        // Only the newest link works.
        resetTokens.deleteAllForUser(user.getId());
        String token = TokenHashing.newOpaqueToken();
        Instant now = clock.instant();
        resetTokens.save(new PasswordResetToken(user.getId(), TokenHashing.sha256Hex(token), now, now.plus(LINK_LIFETIME)));
        mailService.sendPasswordReset(user, token);
    }

    /** Sets the new password and logs the user out everywhere else. */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (!TOKEN_FORMAT.matcher(token).matches()) {
            throw ApiException.invalidField("token", "This link is not valid.");
        }
        PasswordResetToken stored = resetTokens.findByTokenHash(TokenHashing.sha256Hex(token))
                .orElseThrow(PasswordResetService::linkExpired);
        if (resetTokens.markUsed(stored.getId(), clock.instant()) != 1) {
            throw linkExpired();
        }
        User user = users.findById(stored.getUserId()).orElseThrow(PasswordResetService::linkExpired);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        refreshTokens.deleteAllForUser(user.getId());
    }

    private static ApiException linkExpired() {
        return new ApiException(HttpStatus.BAD_REQUEST, "RESET_LINK_EXPIRED", "This link has expired. Ask for a new one.");
    }
}
