package com.subpulse.reminder;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.subpulse.subscription.BillingCycle;
import com.subpulse.user.SupportedCurrency;

/**
 * One active subscription the job looks at, with the owner's details it needs, loaded in one
 * query. A plain record (not an entity) so nothing is lazy-loaded outside a transaction.
 */
public record ReminderCandidate(
        Long subscriptionId,
        String name,
        BigDecimal amount,
        BillingCycle billingCycle,
        LocalDate anchorDate,
        LocalDate nextRenewalDate,
        String paymentMethod,
        Long userId,
        String email,
        String timeZone,
        SupportedCurrency currency,
        boolean remindersEnabled) {
}
