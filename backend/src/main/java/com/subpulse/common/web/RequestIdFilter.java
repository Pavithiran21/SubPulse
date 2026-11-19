package com.subpulse.common.web;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Gives every request an id (the caller's X-Request-Id if it looks safe, otherwise a new UUID),
 * returns it in the X-Request-Id header and error bodies, and writes one access-log line.
 * The log line holds the method, the path without its query string, the status and the time:
 * never headers, bodies or IP addresses, so no personal data reaches the log.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    public static final String ATTRIBUTE = "requestId";
    private static final Pattern SAFE_ID = Pattern.compile("^[\\w-]{1,64}$");
    private static final Logger log = LoggerFactory.getLogger("http");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String incoming = request.getHeader(HEADER);
        String requestId = incoming != null && SAFE_ID.matcher(incoming).matches() ? incoming : UUID.randomUUID().toString();

        request.setAttribute(ATTRIBUTE, requestId);
        response.setHeader(HEADER, requestId);
        MDC.put(ATTRIBUTE, requestId);
        long start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            logRequest(request, response.getStatus(), (System.nanoTime() - start) / 1_000_000);
            MDC.remove(ATTRIBUTE);
        }
    }

    private void logRequest(HttpServletRequest request, int status, long millis) {
        String path = request.getRequestURI();
        if ("/api/health".equals(path)) {
            return;
        }
        String line = "{} {} {} {}ms";
        if (status >= 500) {
            log.error(line, request.getMethod(), path, status, millis);
        } else if (status >= 400) {
            log.warn(line, request.getMethod(), path, status, millis);
        } else {
            log.info(line, request.getMethod(), path, status, millis);
        }
    }

    public static String requestId(HttpServletRequest request) {
        Object id = request.getAttribute(ATTRIBUTE);
        return id == null ? null : id.toString();
    }
}
