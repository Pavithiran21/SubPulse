package com.subpulse.renewal;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import com.subpulse.subscription.BillingCycle;

/**
 * All renewal-date maths in one place, as plain static functions (no database, no clock).
 *
 * The rule: renewal number n is always computed from a fixed anchor date, never from the previous
 * renewal. Java's plusMonths clamps to the last day of a shorter month, so an anchor of 31 January
 * gives 28 February (29 in a leap year), then 31 March, 30 April, 31 May: the 31st comes back.
 * Rolling forward from the previous renewal instead would get stuck on the 28th after February.
 * A yearly anchor of 29 February renews on 28 February in common years and 29 February in leap years.
 */
public final class RenewalSchedule {

    private RenewalSchedule() {
    }

    /** Renewal number n (n may be negative for renewals before the anchor). */
    public static LocalDate occurrence(LocalDate anchor, BillingCycle cycle, long n) {
        return switch (cycle) {
            case WEEKLY -> anchor.plusWeeks(n);
            case MONTHLY -> anchor.plusMonths(n);
            case QUARTERLY -> anchor.plusMonths(3 * n);
            case YEARLY -> anchor.plusYears(n);
        };
    }

    /**
     * The anchor for a new or edited subscription. If the user's "next renewal" is already one of
     * the start date's renewals (the pre-filled value, or any later one), the start date stays the
     * anchor; this keeps 31 January as the anchor even when the next renewal shown is 30 November.
     * A date off that schedule means the user moved their billing day, so it becomes the anchor.
     */
    public static LocalDate chooseAnchor(LocalDate startDate, BillingCycle cycle, LocalDate requestedNextRenewal) {
        if (requestedNextRenewal == null) {
            return startDate;
        }
        LocalDate onSchedule = occurrence(startDate, cycle, firstIndexOnOrAfter(startDate, cycle, requestedNextRenewal));
        return onSchedule.equals(requestedNextRenewal) ? startDate : requestedNextRenewal;
    }

    /**
     * The next renewal to store for a new or edited subscription. A future "next renewal" chosen by
     * the user is kept (it is on the schedule by construction); a past one, or none, moves to the
     * first renewal on or after today.
     */
    public static LocalDate firstRenewal(LocalDate anchor, BillingCycle cycle, LocalDate requestedNextRenewal, LocalDate today) {
        boolean future = requestedNextRenewal != null && requestedNextRenewal.isAfter(today);
        return nextOnOrAfter(anchor, cycle, future ? requestedNextRenewal : today);
    }

    /** The first renewal on or after the given day (never before the anchor). */
    public static LocalDate nextOnOrAfter(LocalDate anchor, BillingCycle cycle, LocalDate day) {
        LocalDate from = day.isBefore(anchor) ? anchor : day;
        return occurrence(anchor, cycle, firstIndexOnOrAfter(anchor, cycle, from));
    }

    /** The next {@code count} renewals starting with the first one on or after the given day. */
    public static List<LocalDate> upcoming(LocalDate anchor, BillingCycle cycle, LocalDate day, int count) {
        LocalDate from = day.isBefore(anchor) ? anchor : day;
        long first = firstIndexOnOrAfter(anchor, cycle, from);
        List<LocalDate> dates = new ArrayList<>();
        for (long n = first; n < first + count; n++) {
            dates.add(occurrence(anchor, cycle, n));
        }
        return dates;
    }

    /**
     * Every renewal in [from, toExclusive), not before the start date. Renewals before the anchor
     * are included (counted backwards from it), so a month in the past still shows its renewals.
     */
    public static List<LocalDate> between(LocalDate anchor, BillingCycle cycle, LocalDate startDate,
            LocalDate from, LocalDate toExclusive) {
        LocalDate lowerBound = from.isBefore(startDate) ? startDate : from;
        List<LocalDate> dates = new ArrayList<>();
        for (long n = firstIndexOnOrAfter(anchor, cycle, lowerBound); ; n++) {
            LocalDate date = occurrence(anchor, cycle, n);
            if (!date.isBefore(toExclusive)) {
                return dates;
            }
            dates.add(date);
        }
    }

    /** True when the month was too short for the anchor's day, for example 30 April for a 31st anchor. */
    public static boolean isMonthEndAdjusted(LocalDate anchor, BillingCycle cycle, LocalDate renewal) {
        return cycle != BillingCycle.WEEKLY && renewal.getDayOfMonth() < anchor.getDayOfMonth();
    }

    /** The note shown next to an adjusted date: "February" or "month has 30 days". */
    public static String adjustmentNote(LocalDate renewal) {
        if (renewal.getMonthValue() == 2) {
            return "February";
        }
        return "month has " + renewal.lengthOfMonth() + " days";
    }

    /**
     * The smallest n whose renewal falls on or after the day. ChronoUnit gives a close first guess
     * (it never overshoots by more than one step); the two loops then correct it. Renewal dates
     * grow with n, so both loops end after a step or two.
     */
    static long firstIndexOnOrAfter(LocalDate anchor, BillingCycle cycle, LocalDate day) {
        long n = switch (cycle) {
            case WEEKLY -> ChronoUnit.WEEKS.between(anchor, day);
            case MONTHLY -> ChronoUnit.MONTHS.between(anchor, day);
            case QUARTERLY -> ChronoUnit.MONTHS.between(anchor, day) / 3;
            case YEARLY -> ChronoUnit.YEARS.between(anchor, day);
        };
        while (occurrence(anchor, cycle, n).isBefore(day)) {
            n++;
        }
        while (!occurrence(anchor, cycle, n - 1).isBefore(day)) {
            n--;
        }
        return n;
    }
}
