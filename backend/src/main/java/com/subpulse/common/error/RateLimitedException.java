package com.subpulse.common.error;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;

/** 429, telling the client how many seconds to wait in the Retry-After header. */
public class RateLimitedException extends ApiException {

    public RateLimitedException(long retryAfterSeconds) {
        super(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
        withHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds));
    }
}
