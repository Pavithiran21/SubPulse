package com.subpulse.reminder;

/** One "remind me N days before" choice of one subscription. */
public record ReminderDay(Long subscriptionId, Integer daysBefore) {
}
