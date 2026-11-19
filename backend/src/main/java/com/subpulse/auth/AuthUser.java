package com.subpulse.auth;

/** The logged-in user, as put in the security context by {@link JwtAuthenticationFilter}. */
public record AuthUser(Long id) {
}
