package com.subpulse.auth;

import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.auth.AuthDtos.LoginRequest;
import com.subpulse.auth.AuthDtos.RegisterRequest;
import com.subpulse.common.error.ApiException;
import com.subpulse.common.error.DatabaseErrors;
import com.subpulse.common.error.ErrorDetail;
import com.subpulse.common.web.RateLimiter;
import com.subpulse.common.web.RateLimiter.Limit;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/** Register, log in, refresh and log out. Password reset is in {@link PasswordResetService}. */
@Service
public class AuthService {

    /** New accounts start with reminders 7, 3 and 1 days before, as in the design. */
    public static final Set<Integer> DEFAULT_REMINDER_DAYS = Set.of(7, 3, 1);

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final SessionService sessions;
    private final PasswordEncoder passwordEncoder;
    private final RateLimiter rateLimiter;
    private final Clock clock;
    /** Checked when the email is unknown, so a wrong email takes as long as a wrong password. */
    private final String dummyPasswordHash;

    public AuthService(UserRepository users, RefreshTokenRepository refreshTokens, SessionService sessions,
            PasswordEncoder passwordEncoder, RateLimiter rateLimiter, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.sessions = sessions;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
        this.clock = clock;
        this.dummyPasswordHash = passwordEncoder.encode("not-a-real-password-1");
    }

    @Transactional
    public AuthSession register(RegisterRequest request, String clientIp) {
        rateLimiter.consume(Limit.REGISTER, clientIp);
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) {
            throw emailTaken();
        }
        User user = new User(request.name().trim(), email, passwordEncoder.encode(request.password()),
                request.timeZone(), request.currency(), DEFAULT_REMINDER_DAYS);
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            // Two sign-ups with the same email at the same moment: the UNIQUE index stops the second.
            if (DatabaseErrors.isDuplicateKey(ex)) {
                throw emailTaken();
            }
            throw ex;
        }
        return sessions.start(user);
    }

    @Transactional
    public AuthSession login(LoginRequest request, String clientIp) {
        rateLimiter.consume(Limit.LOGIN_IP, clientIp);
        String email = normalizeEmail(request.email());
        rateLimiter.ensureNotExhausted(Limit.LOGIN_FAILED_ACCOUNT, email);

        Optional<User> user = users.findByEmail(email);
        String hash = user.map(User::getPasswordHash).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(request.password(), hash);
        if (user.isEmpty() || !passwordMatches) {
            rateLimiter.recordFailure(Limit.LOGIN_FAILED_ACCOUNT, email);
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "That email or password doesn't match. Try again.");
        }
        return sessions.start(user.get());
    }

    /**
     * Swaps a refresh token for a new pair. The old row is deleted first and the delete must report
     * one row, so the same cookie can never be used twice, even by two requests at once.
     */
    @Transactional
    public AuthSession refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw sessionExpired();
        }
        RefreshToken stored = refreshTokens.findByTokenHash(TokenHashing.sha256Hex(refreshToken))
                .orElseThrow(AuthService::sessionExpired);
        if (refreshTokens.deleteByIdReturningCount(stored.getId()) != 1 || !stored.getExpiresAt().isAfter(clock.instant())) {
            throw sessionExpired();
        }
        User user = users.findById(stored.getUserId()).orElseThrow(AuthService::sessionExpired);
        return sessions.start(user);
    }

    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokens.deleteByTokenHash(TokenHashing.sha256Hex(refreshToken));
        }
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static ApiException emailTaken() {
        return new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "That email already has an account.",
                List.of(new ErrorDetail("email", "That email already has an account. Log in instead.")));
    }

    private static ApiException sessionExpired() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "Your session has ended. Log in again.");
    }
}
