package com.subpulse.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.subpulse.config.AppProperties;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Short-lived access tokens: an HS256 JWT that holds only the user id ("sub") and lasts 15 minutes.
 * jjwt checks the signature and the expiry; an HMAC key only accepts HMAC algorithms, so a token
 * signed with "none" or RS256 is refused.
 */
@Service
public class AccessTokenService {

    public static final Duration LIFETIME = Duration.ofMinutes(15);

    private final SecretKey key;
    private final Clock clock;

    public AccessTokenService(AppProperties props, Clock clock) {
        this.key = Keys.hmacShaKeyFor(props.jwtSecret().getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    public String create(Long userId) {
        Instant now = clock.instant();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(LIFETIME)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Returns the user id, or throws {@link io.jsonwebtoken.ExpiredJwtException} for an expired
     * token and another {@link JwtException} for any other bad token.
     */
    public Long parseUserId(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        try {
            return Long.valueOf(claims.getSubject());
        } catch (NumberFormatException ex) {
            throw new JwtException("Token subject is not a user id");
        }
    }
}
