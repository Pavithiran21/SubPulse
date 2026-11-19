package com.subpulse.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

import com.subpulse.common.validation.ValidAmount;
import com.subpulse.common.validation.ValidReminderDays;
import com.subpulse.common.web.Money;
import com.subpulse.renewal.RenewalSchedule;
import com.subpulse.user.SupportedCurrency;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request and response bodies of /api/subscriptions. Messages match UI-UX.md. */
public final class SubscriptionDtos {

    private SubscriptionDtos() {
    }

    /**
     * Body of POST (create) and PUT (edit). nextRenewalDate is optional: without it the first
     * renewal on or after today is used. reminderDays is optional on create: without it the
     * user's default reminders are used. version is required on PUT (see SubscriptionService.update).
     */
    public record SubscriptionRequest(
            @NotBlank(message = "Enter a name, like Netflix.") @Size(max = 80, message = "Use at most 80 characters.") String name,
            @NotNull(message = "Pick a category.") Category category,
            @NotNull(message = "Enter an amount greater than 0.") @ValidAmount BigDecimal amount,
            @NotNull(message = "Pick how often it renews.") BillingCycle billingCycle,
            @NotNull(message = "Enter a valid date.") LocalDate startDate,
            LocalDate nextRenewalDate,
            @Size(max = 40, message = "Use at most 40 characters.") String paymentMethod,
            @Size(max = 500, message = "Use at most 500 characters.") String notes,
            @ValidReminderDays Set<Integer> reminderDays,
            Integer version) {
    }

    /**
     * One subscription. nextRenewalDate, daysUntilRenewal and monthEndAdjusted are only filled for
     * ACTIVE subscriptions: a paused or cancelled one has no upcoming renewal.
     */
    public record SubscriptionResponse(
            Long id,
            String name,
            Category category,
            String amount,
            SupportedCurrency currency,
            BillingCycle billingCycle,
            LocalDate startDate,
            LocalDate nextRenewalDate,
            Long daysUntilRenewal,
            boolean monthEndAdjusted,
            String paymentMethod,
            String notes,
            List<Integer> reminderDays,
            SubscriptionStatus status,
            Instant statusChangedAt,
            Integer version,
            Instant createdAt,
            Instant updatedAt) {

        public static SubscriptionResponse from(Subscription s, SupportedCurrency currency, LocalDate today) {
            boolean active = s.getStatus() == SubscriptionStatus.ACTIVE;
            LocalDate next = active ? s.getNextRenewalDate() : null;
            return new SubscriptionResponse(
                    s.getId(),
                    s.getName(),
                    s.getCategory(),
                    Money.format(s.getAmount()),
                    currency,
                    s.getBillingCycle(),
                    s.getStartDate(),
                    next,
                    active ? ChronoUnit.DAYS.between(today, next) : null,
                    active && RenewalSchedule.isMonthEndAdjusted(s.getBillingAnchorDate(), s.getBillingCycle(), next),
                    s.getPaymentMethod(),
                    s.getNotes(),
                    s.getReminderDays().stream().sorted(Comparator.reverseOrder()).toList(),
                    s.getStatus(),
                    s.getStatusChangedAt(),
                    s.getVersion(),
                    s.getCreatedAt(),
                    s.getUpdatedAt());
        }
    }
}
