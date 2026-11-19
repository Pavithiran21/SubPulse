package com.subpulse.common.error;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * An expected failure with a status, a stable code for the frontend and a message for the user.
 * Services throw it; {@link GlobalExceptionHandler} turns it into the shared error body.
 * It can carry response headers, for example Retry-After or a Set-Cookie that clears the login.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final List<ErrorDetail> details;
    private final Map<String, String> headers = new LinkedHashMap<>();

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of());
    }

    public ApiException(HttpStatus status, String code, String message, List<ErrorDetail> details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    /** 404 for a missing resource, and also for one that belongs to someone else (no IDOR leak). */
    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", what + " not found.");
    }

    /** 400 for one field, used for rules that Bean Validation can't express on its own. */
    public static ApiException invalidField(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Some fields are not valid.",
                List.of(new ErrorDetail(field, message)));
    }

    public static ApiException unauthenticated() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Log in to continue.");
    }

    public ApiException withHeader(String name, String value) {
        headers.put(name, value);
        return this;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public List<ErrorDetail> getDetails() {
        return details;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }
}
