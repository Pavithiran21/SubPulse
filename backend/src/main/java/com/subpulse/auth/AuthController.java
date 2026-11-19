package com.subpulse.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.subpulse.auth.AuthDtos.AuthResponse;
import com.subpulse.auth.AuthDtos.ForgotPasswordRequest;
import com.subpulse.auth.AuthDtos.LoginRequest;
import com.subpulse.auth.AuthDtos.MessageResponse;
import com.subpulse.auth.AuthDtos.RegisterRequest;
import com.subpulse.auth.AuthDtos.ResetPasswordRequest;
import com.subpulse.common.error.ApiException;
import com.subpulse.common.web.RateLimiter;
import com.subpulse.common.web.RateLimiter.Limit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** Public auth endpoints. The access token goes in the body, the refresh token in the cookie. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final AuthCookies cookies;
    private final RateLimiter rateLimiter;

    public AuthController(AuthService authService, PasswordResetService passwordResetService, AuthCookies cookies,
            RateLimiter rateLimiter) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.cookies = cookies;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request) {
        return withSession(HttpStatus.CREATED, authService.register(body, request.getRemoteAddr()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest body, HttpServletRequest request) {
        return withSession(HttpStatus.OK, authService.login(body, request.getRemoteAddr()));
    }

    /** Refused tokens also clear the cookie, so the browser stops sending a dead one. */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@CookieValue(name = AuthCookies.NAME, required = false) String refreshToken) {
        try {
            return withSession(HttpStatus.OK, authService.refresh(refreshToken));
        } catch (ApiException ex) {
            throw ex.withHeader(HttpHeaders.SET_COOKIE, cookies.clear());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = AuthCookies.NAME, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear()).build();
    }

    /** Always the same 202 answer, whether or not the email has an account. */
    @PostMapping("/forgot-password")
    public ResponseEntity<MessageResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest body,
            HttpServletRequest request) {
        rateLimiter.consume(Limit.FORGOT_PASSWORD, request.getRemoteAddr());
        passwordResetService.sendResetLink(body.email());
        return ResponseEntity.accepted()
                .body(new MessageResponse("If that email has an account, we've sent a link to reset the password."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
        rateLimiter.consume(Limit.RESET_PASSWORD, request.getRemoteAddr());
        passwordResetService.resetPassword(body.token(), body.password());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<AuthResponse> withSession(HttpStatus status, AuthSession session) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, cookies.create(session.refreshToken()))
                .body(new AuthResponse(session.user(), session.accessToken()));
    }
}
