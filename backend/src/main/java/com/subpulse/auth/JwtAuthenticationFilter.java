package com.subpulse.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Reads "Authorization: Bearer <token>". A valid token logs the request in as that user.
 * A bad token doesn't fail here: the reason is stored on the request, and if the endpoint needs
 * a login, {@link RestAuthenticationEntryPoint} answers 401 TOKEN_EXPIRED or TOKEN_INVALID.
 * It never reads the database, so it stays cheap on every request.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    static final String FAILURE_ATTRIBUTE = "auth.failure";
    private static final String BEARER = "Bearer ";

    private final AccessTokenService accessTokens;

    public JwtAuthenticationFilter(AccessTokenService accessTokens) {
        this.accessTokens = accessTokens;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER)) {
            try {
                Long userId = accessTokens.parseUserId(header.substring(BEARER.length()).trim());
                var authentication = new UsernamePasswordAuthenticationToken(new AuthUser(userId), null, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (ExpiredJwtException ex) {
                request.setAttribute(FAILURE_ATTRIBUTE, "TOKEN_EXPIRED");
            } catch (JwtException | IllegalArgumentException ex) {
                request.setAttribute(FAILURE_ATTRIBUTE, "TOKEN_INVALID");
            }
        }
        chain.doFilter(request, response);
    }
}
