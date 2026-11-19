package com.subpulse.dashboard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.common.error.ApiException;
import com.subpulse.common.web.Money;
import com.subpulse.dashboard.DashboardDtos.CalendarRenewal;
import com.subpulse.dashboard.DashboardDtos.CalendarResponse;
import com.subpulse.dashboard.DashboardDtos.CategorySpend;
import com.subpulse.dashboard.DashboardDtos.DashboardResponse;
import com.subpulse.dashboard.DashboardDtos.DueSoon;
import com.subpulse.dashboard.DashboardDtos.UpcomingRenewal;
import com.subpulse.renewal.RenewalSchedule;
import com.subpulse.subscription.Category;
import com.subpulse.subscription.Subscription;
import com.subpulse.subscription.SubscriptionRepository;
import com.subpulse.subscription.SubscriptionStatus;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/**
 * Totals for the dashboard band and the renewal calendar, all in BigDecimal.
 *
 * Spend rule: a subscription's yearly cost is exact (amount x 52, 12, 4 or 1 for weekly, monthly,
 * quarterly, yearly). Monthly spend is the yearly total / 12, rounded half-up to 2 decimals once,
 * at the end, so rounding errors never pile up across subscriptions. Only ACTIVE subscriptions
 * count as spend; "saved per month" is the same rule over CANCELLED ones.
 */
@Service
public class DashboardService {

    private static final BigDecimal MONTHS_PER_YEAR = BigDecimal.valueOf(12);
    private static final int DUE_SOON_DAYS = 30;
    private static final int NEXT_UP_COUNT = 3;

    private final SubscriptionRepository subscriptions;
    private final UserRepository users;
    private final Clock clock;

    public DashboardService(SubscriptionRepository subscriptions, UserRepository users, Clock clock) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardResponse summary(Long userId) {
        User user = loadUser(userId);
        LocalDate today = user.today(clock);
        List<Subscription> active = subscriptions.findByUserIdAndStatusIn(userId, Set.of(SubscriptionStatus.ACTIVE));
        List<Subscription> cancelled = subscriptions.findByUserIdAndStatusIn(userId, Set.of(SubscriptionStatus.CANCELLED));

        BigDecimal yearlySpend = yearlyCost(active);

        Map<Category, BigDecimal> yearlyByCategory = new EnumMap<>(Category.class);
        for (Subscription s : active) {
            yearlyByCategory.merge(s.getCategory(), s.getBillingCycle().yearlyCost(s.getAmount()), BigDecimal::add);
        }
        List<CategorySpend> byCategory = yearlyByCategory.entrySet().stream()
                .sorted(Map.Entry.<Category, BigDecimal>comparingByValue().reversed())
                .map(entry -> new CategorySpend(entry.getKey(), Money.format(perMonth(entry.getValue()))))
                .toList();

        // Real renewals in [today, today + 30): a weekly subscription counts about four times.
        LocalDate dueUntil = today.plusDays(DUE_SOON_DAYS);
        BigDecimal dueTotal = BigDecimal.ZERO;
        int dueCount = 0;
        for (Subscription s : active) {
            int renewals = upcomingRenewals(s, today, dueUntil).size();
            dueTotal = dueTotal.add(s.getAmount().multiply(BigDecimal.valueOf(renewals)));
            dueCount += renewals;
        }

        List<UpcomingRenewal> nextUp = active.stream()
                .sorted(Comparator.comparing(Subscription::getNextRenewalDate)
                        .thenComparing(Subscription::getName, String.CASE_INSENSITIVE_ORDER))
                .limit(NEXT_UP_COUNT)
                .map(s -> new UpcomingRenewal(s.getId(), s.getName(), s.getCategory(), Money.format(s.getAmount()),
                        s.getPaymentMethod(), s.getNextRenewalDate(), ChronoUnit.DAYS.between(today, s.getNextRenewalDate())))
                .toList();

        return new DashboardResponse(
                user.getCurrency(),
                today,
                active.size(),
                Money.format(perMonth(yearlySpend)),
                Money.format(yearlySpend),
                new DueSoon(Money.format(dueTotal), dueCount),
                Money.format(perMonth(yearlyCost(cancelled))),
                byCategory,
                nextUp);
    }

    /**
     * Every renewal of the user's active subscriptions in one month. Past days show the renewals
     * that already happened; from today on, only renewals from the stored next renewal onwards.
     */
    @Transactional(readOnly = true)
    public CalendarResponse calendar(Long userId, String month) {
        User user = loadUser(userId);
        LocalDate today = user.today(clock);
        YearMonth yearMonth = parseMonth(month, today);
        LocalDate from = yearMonth.atDay(1);
        LocalDate to = yearMonth.plusMonths(1).atDay(1);

        List<CalendarRenewal> renewals = new ArrayList<>();
        for (Subscription s : subscriptions.findByUserIdAndStatusIn(userId, Set.of(SubscriptionStatus.ACTIVE))) {
            for (LocalDate date : RenewalSchedule.between(s.getBillingAnchorDate(), s.getBillingCycle(), s.getStartDate(), from, to)) {
                boolean past = date.isBefore(today);
                if (past || !date.isBefore(s.getNextRenewalDate())) {
                    renewals.add(new CalendarRenewal(date, past,
                            RenewalSchedule.isMonthEndAdjusted(s.getBillingAnchorDate(), s.getBillingCycle(), date),
                            s.getId(), s.getName(), s.getCategory(), Money.format(s.getAmount())));
                }
            }
        }
        renewals.sort(Comparator.comparing(CalendarRenewal::date).thenComparing(CalendarRenewal::name, String.CASE_INSENSITIVE_ORDER));
        return new CalendarResponse(yearMonth.toString(), today, user.getCurrency(), renewals);
    }

    private static List<LocalDate> upcomingRenewals(Subscription s, LocalDate today, LocalDate untilExclusive) {
        LocalDate from = s.getNextRenewalDate().isBefore(today) ? today : s.getNextRenewalDate();
        return RenewalSchedule.between(s.getBillingAnchorDate(), s.getBillingCycle(), s.getStartDate(), from, untilExclusive);
    }

    private static BigDecimal yearlyCost(List<Subscription> list) {
        BigDecimal total = BigDecimal.ZERO;
        for (Subscription s : list) {
            total = total.add(s.getBillingCycle().yearlyCost(s.getAmount()));
        }
        return total;
    }

    private static BigDecimal perMonth(BigDecimal yearly) {
        return yearly.divide(MONTHS_PER_YEAR, 2, RoundingMode.HALF_UP);
    }

    private static YearMonth parseMonth(String month, LocalDate today) {
        if (month == null || month.isBlank()) {
            return YearMonth.from(today);
        }
        try {
            YearMonth parsed = YearMonth.parse(month);
            if (parsed.getYear() < 2000 || parsed.getYear() > 2100) {
                throw ApiException.invalidField("month", "Use a month like 2026-10.");
            }
            return parsed;
        } catch (DateTimeParseException ex) {
            throw ApiException.invalidField("month", "Use a month like 2026-10.");
        }
    }

    private User loadUser(Long userId) {
        return users.findById(userId).orElseThrow(ApiException::unauthenticated);
    }
}
