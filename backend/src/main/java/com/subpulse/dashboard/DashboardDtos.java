package com.subpulse.dashboard;

import java.time.LocalDate;
import java.util.List;

import com.subpulse.subscription.Category;
import com.subpulse.user.SupportedCurrency;

/** Response bodies of /api/dashboard and /api/calendar. Money is a string with 2 decimals. */
public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record DashboardResponse(
            SupportedCurrency currency,
            LocalDate today,
            int activeCount,
            String monthlySpend,
            String yearlySpend,
            DueSoon dueIn30Days,
            String savedPerMonth,
            List<CategorySpend> byCategory,
            List<UpcomingRenewal> nextUp) {
    }

    public record DueSoon(String total, int count) {
    }

    public record CategorySpend(Category category, String monthlySpend) {
    }

    public record UpcomingRenewal(Long subscriptionId, String name, Category category, String amount, String paymentMethod,
            LocalDate date, long daysUntil) {
    }

    public record CalendarResponse(String month, LocalDate today, SupportedCurrency currency, List<CalendarRenewal> renewals) {
    }

    public record CalendarRenewal(LocalDate date, boolean past, boolean monthEndAdjusted, Long subscriptionId, String name,
            Category category, String amount) {
    }
}
