package com.subpulse.common.error;

import java.util.List;

/**
 * The error body every SubPulse endpoint returns, the same shape as every other project:
 * {"error":{"code":"VALIDATION_FAILED","message":"...","details":[...],"requestId":"..."}}
 */
public record ErrorResponse(Body error) {

    public record Body(String code, String message, List<ErrorDetail> details, String requestId) {
    }

    public static ErrorResponse of(String code, String message, List<ErrorDetail> details, String requestId) {
        return new ErrorResponse(new Body(code, message, details == null ? List.of() : details, requestId));
    }
}
