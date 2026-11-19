package com.subpulse.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.stereotype.Service;

import com.subpulse.subscription.SubscriptionRepository;
import com.subpulse.user.User;
import com.subpulse.user.UserResponse;

/** Starts a login for a user: a new refresh token row plus a 15-minute access token. */
@Service
public class SessionService {

    public static final Duration REFRESH_LIFETIME = Duration.ofDays(7);

    private final RefreshTokenRepository refreshTokens;
    private final AccessTokenService accessTokens;
    private final SubscriptionRepository subscriptions;
    private final Clock clock;

    public SessionService(RefreshTokenRepository refreshTokens, AccessTokenService accessTokens,
            SubscriptionRepository subscriptions, Clock clock) {
        this.refreshTokens = refreshTokens;
        this.accessTokens = accessTokens;
        this.subscriptions = subscriptions;
        this.clock = clock;
    }

    public AuthSession start(User user) {
        String refreshToken = TokenHashing.newOpaqueToken();
        Instant now = clock.instant();
        refreshTokens.save(new RefreshToken(user.getId(), TokenHashing.sha256Hex(refreshToken), now, now.plus(REFRESH_LIFETIME)));
        return new AuthSession(profileOf(user), accessTokens.create(user.getId()), refreshToken);
    }

    /** The currency is locked once the user has a subscription (its amount is in that currency). */
    public UserResponse profileOf(User user) {
        return UserResponse.from(user, subscriptions.existsByUserId(user.getId()));
    }
}
