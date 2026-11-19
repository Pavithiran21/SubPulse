package com.subpulse.user;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/** The profile as the frontend sees it. Reminder days are sorted largest first: [7, 3, 1]. */
public record UserResponse(
        Long id,
        String name,
        String email,
        String timeZone,
        SupportedCurrency currency,
        boolean currencyLocked,
        boolean remindersEnabled,
        List<Integer> defaultReminderDays,
        boolean isDemo,
        Instant createdAt) {

    public static UserResponse from(User user, boolean currencyLocked) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getTimeZone(),
                user.getCurrency(),
                currencyLocked,
                user.isRemindersEnabled(),
                user.getDefaultReminderDays().stream().sorted(Comparator.reverseOrder()).toList(),
                user.isDemo(),
                user.getCreatedAt());
    }
}
