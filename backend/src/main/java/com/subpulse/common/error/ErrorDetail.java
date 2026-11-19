package com.subpulse.common.error;

/** One field-level problem inside an error response, for example {"field":"amount","message":"..."}. */
public record ErrorDetail(String field, String message) {
}
