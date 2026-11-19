package com.subpulse.common.web;

import java.io.IOException;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import com.subpulse.common.error.ErrorDetail;
import com.subpulse.common.error.ErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * Writes the shared error body from places that run before a controller (servlet filters and the
 * Spring Security handlers), where @RestControllerAdvice can't help.
 */
@Component
public class ErrorWriter {

    private final ObjectMapper objectMapper;

    public ErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletRequest request, HttpServletResponse response, int status, String code, String message)
            throws IOException {
        write(request, response, status, code, message, List.of());
    }

    public void write(HttpServletRequest request, HttpServletResponse response, int status, String code, String message,
            List<ErrorDetail> details) throws IOException {
        ErrorResponse body = ErrorResponse.of(code, message, details, RequestIdFilter.requestId(request));
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
