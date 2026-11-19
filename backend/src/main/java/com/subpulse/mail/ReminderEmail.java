package com.subpulse.mail;

import java.time.LocalDate;
import java.util.Set;

/** Everything one renewal-reminder email shows, already formatted for the user's currency. */
public record ReminderEmail(
        Long userId,
        String to,
        Long subscriptionId,
        String subscriptionName,
        String amountText,
        LocalDate renewalDate,
        String cycleLabel,
        String paymentMethod,
        int daysBefore,
        Set<Integer> chosenDays) {
}
