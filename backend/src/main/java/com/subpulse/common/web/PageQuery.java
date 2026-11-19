package com.subpulse.common.web;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.subpulse.common.error.ApiException;

/**
 * The shared list parameters: page (1-based, default 1), size (1–100, default 20) and
 * sort ("field" ascending or "-field" descending, from an allow-list). Bad values are a 400,
 * never silently clamped, the same rules as WeatherPing.
 */
public final class PageQuery {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;
    private static final int MAX_SORT_LENGTH = 50;

    private PageQuery() {
    }

    public static Pageable toPageable(Integer page, Integer size, String sort, List<String> sortFields, String defaultSort) {
        int pageNumber = page == null ? 1 : page;
        int pageSize = size == null ? DEFAULT_SIZE : size;
        if (pageNumber < 1) {
            throw ApiException.invalidField("page", "Use a page number of 1 or more.");
        }
        if (pageSize < 1 || pageSize > MAX_SIZE) {
            throw ApiException.invalidField("size", "Use a page size from 1 to " + MAX_SIZE + ".");
        }
        return PageRequest.of(pageNumber - 1, pageSize, toSort(sort == null || sort.isBlank() ? defaultSort : sort, sortFields));
    }

    private static Sort toSort(String sort, List<String> sortFields) {
        boolean descending = sort.startsWith("-");
        String field = descending ? sort.substring(1) : sort;
        if (sort.length() > MAX_SORT_LENGTH || !sortFields.contains(field)) {
            throw ApiException.invalidField("sort", "Sort by one of: " + String.join(", ", sortFields));
        }
        Sort.Direction direction = descending ? Sort.Direction.DESC : Sort.Direction.ASC;
        // The id breaks ties so pages never repeat or skip a row.
        return Sort.by(direction, field).and(Sort.by(direction, "id"));
    }
}
