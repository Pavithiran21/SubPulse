package com.subpulse.mail;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** The wording used in emails: subjects, dates and the "You chose reminders ..." line. */
public final class MailText {

    /** "Mon 20 Oct 2026". Locale.ENGLISH, because en-GB writes September as "Sept". */
    private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("EEE d MMM yyyy", Locale.ENGLISH);

    private MailText() {
    }

    public static String reminderSubject(String name, int daysBefore) {
        return name + " renews " + whenText(daysBefore);
    }

    /** "today", "tomorrow" or "in 3 days". */
    public static String whenText(int daysBefore) {
        if (daysBefore == 0) {
            return "today";
        }
        if (daysBefore == 1) {
            return "tomorrow";
        }
        return "in " + daysBefore + " days";
    }

    public static String longDate(LocalDate date) {
        return LONG_DATE.format(date);
    }

    /** "Cancel with Netflix before the 20th" or, on the renewal day itself, "Cancel with Netflix today". */
    public static String cancelAdvice(String name, LocalDate renewalDate, int daysBefore) {
        String deadline = daysBefore == 0 ? "today" : "before the " + ordinal(renewalDate.getDayOfMonth());
        return "Still using it? Nothing to do. Want to stop? Cancel with " + name + " " + deadline
                + ", then mark it cancelled in SubPulse.";
    }

    public static String ordinal(int day) {
        if (day >= 11 && day <= 13) {
            return day + "th";
        }
        return switch (day % 10) {
            case 1 -> day + "st";
            case 2 -> day + "nd";
            case 3 -> day + "rd";
            default -> day + "th";
        };
    }

    /** [7, 3, 1] gives "7, 3 and 1 days before"; [1, 0] gives "1 day before and on the renewal day". */
    public static String chosenDaysText(Set<Integer> days) {
        List<Integer> before = days.stream().filter(day -> day > 0).sorted(Comparator.reverseOrder()).toList();
        List<String> parts = new ArrayList<>();
        if (!before.isEmpty()) {
            boolean single = before.size() == 1 && before.get(0) == 1;
            parts.add(joinWithAnd(before.stream().map(String::valueOf).toList()) + (single ? " day before" : " days before"));
        }
        if (days.contains(0)) {
            parts.add("on the renewal day");
        }
        return String.join(" and ", parts);
    }

    private static String joinWithAnd(List<String> items) {
        if (items.size() == 1) {
            return items.get(0);
        }
        return String.join(", ", items.subList(0, items.size() - 1)) + " and " + items.get(items.size() - 1);
    }
}
