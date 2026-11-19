package com.subpulse.common.web;

import java.io.IOException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Refuses request bodies over 10 KB (every SubPulse request is a small JSON object). */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class BodySizeLimitFilter extends OncePerRequestFilter {

    private static final long MAX_BODY_BYTES = 10 * 1024;

    private final ErrorWriter errorWriter;

    public BodySizeLimitFilter(ErrorWriter errorWriter) {
        this.errorWriter = errorWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > MAX_BODY_BYTES) {
            errorWriter.write(request, response, 413, "PAYLOAD_TOO_LARGE", "The request body is too large.");
            return;
        }
        chain.doFilter(request, response);
    }
}
