package com.subpulse.auth;

import java.time.Duration;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import com.subpulse.config.AppProperties;

/**
 * The refresh-token cookie: HttpOnly (JavaScript can't read it), SameSite=Strict (other sites
 * can't send it), only sent to /api/auth, Secure in production.
 */
@Component
public class AuthCookies {

    public static final String NAME = "sp_refresh";
    private static final String PATH = "/api/auth";

    private final boolean secure;

    public AuthCookies(AppProperties props) {
        this.secure = props.isProduction();
    }

    public String create(String refreshToken) {
        return build(refreshToken, SessionService.REFRESH_LIFETIME);
    }

    public String clear() {
        return build("", Duration.ZERO);
    }

    private String build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(PATH)
                .maxAge(maxAge)
                .build()
                .toString();
    }
}
