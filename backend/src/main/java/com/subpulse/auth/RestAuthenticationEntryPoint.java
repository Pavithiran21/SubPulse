package com.subpulse.auth;

import java.io.IOException;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import com.subpulse.common.web.ErrorWriter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** 401 in the shared error format when an endpoint needs a login and the request has none. */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ErrorWriter errorWriter;

    public RestAuthenticationEntryPoint(ErrorWriter errorWriter) {
        this.errorWriter = errorWriter;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {
        Object failure = request.getAttribute(JwtAuthenticationFilter.FAILURE_ATTRIBUTE);
        if ("TOKEN_EXPIRED".equals(failure)) {
            errorWriter.write(request, response, 401, "TOKEN_EXPIRED", "Your session has expired. Log in again.");
        } else if ("TOKEN_INVALID".equals(failure)) {
            errorWriter.write(request, response, 401, "TOKEN_INVALID", "Your session is not valid. Log in again.");
        } else {
            errorWriter.write(request, response, 401, "UNAUTHENTICATED", "Log in to continue.");
        }
    }
}
