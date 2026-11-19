package com.subpulse.user;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.auth.AuthSession;
import com.subpulse.auth.RefreshTokenRepository;
import com.subpulse.auth.SessionService;
import com.subpulse.common.error.ApiException;
import com.subpulse.common.error.ErrorDetail;
import com.subpulse.subscription.SubscriptionRepository;
import com.subpulse.user.ProfileDtos.UpdateProfileRequest;

/** The logged-in user's own profile, settings, password and account deletion. */
@Service
public class ProfileService {

    private final UserRepository users;
    private final SubscriptionRepository subscriptions;
    private final RefreshTokenRepository refreshTokens;
    private final SessionService sessions;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UserRepository users, SubscriptionRepository subscriptions, RefreshTokenRepository refreshTokens,
            SessionService sessions, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.subscriptions = subscriptions;
        this.refreshTokens = refreshTokens;
        this.sessions = sessions;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserResponse get(Long userId) {
        return sessions.profileOf(load(userId));
    }

    @Transactional
    public UserResponse update(Long userId, UpdateProfileRequest request) {
        if (request.isEmpty()) {
            throw ApiException.invalidField("name", "Change at least one setting.");
        }
        User user = load(userId);
        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw ApiException.invalidField("name", "Enter your name.");
            }
            user.setName(request.name().trim());
        }
        if (request.timeZone() != null) {
            user.setTimeZone(request.timeZone());
        }
        if (request.currency() != null && request.currency() != user.getCurrency()) {
            // Amounts are stored without a currency, so changing it would silently change their meaning.
            if (subscriptions.existsByUserId(userId)) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "CURRENCY_LOCKED",
                        "Your currency is locked after your first subscription.",
                        List.of(new ErrorDetail("currency", "Locked after your first subscription.")));
            }
            user.setCurrency(request.currency());
        }
        if (request.remindersEnabled() != null) {
            user.setRemindersEnabled(request.remindersEnabled());
        }
        if (request.defaultReminderDays() != null) {
            user.setDefaultReminderDays(request.defaultReminderDays());
        }
        return sessions.profileOf(user);
    }

    /** Logs out every other browser and returns a new login for this one. */
    @Transactional
    public AuthSession changePassword(Long userId, String currentPassword, String newPassword) {
        User user = load(userId);
        ensureNotDemo(user, "Demo accounts can't change the password.");
        checkPassword(user, currentPassword, "currentPassword");
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        refreshTokens.deleteAllForUser(userId);
        return sessions.start(user);
    }

    /** Deletes the user; ON DELETE CASCADE removes subscriptions, reminder logs and tokens with it. */
    @Transactional
    public void deleteAccount(Long userId, String password) {
        User user = load(userId);
        ensureNotDemo(user, "Demo accounts can't be deleted.");
        checkPassword(user, password, "password");
        users.delete(user);
    }

    /** A valid token for a deleted account gets 401, so the frontend sends the user to log in. */
    private User load(Long userId) {
        return users.findById(userId).orElseThrow(ApiException::unauthenticated);
    }

    private static void ensureNotDemo(User user, String message) {
        if (user.isDemo()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "DEMO_ACCOUNT_LOCKED", message);
        }
    }

    /** 400, not 401: the frontend treats any 401 as "logged out". */
    private void checkPassword(User user, String password, String field) {
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WRONG_PASSWORD", "That password isn't right.",
                    List.of(new ErrorDetail(field, "That password isn't right.")));
        }
    }
}
