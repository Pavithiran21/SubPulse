package com.subpulse.renewal;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.common.error.ApiException;
import com.subpulse.reminder.ReminderService;
import com.subpulse.subscription.BillingCycle;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/**
 * What the Add/Edit drawer shows while the user types: the pre-filled next renewal, the next four
 * renewal dates (with month-end notes) and when each reminder will be sent. The browser calls this
 * instead of doing date maths itself, so the dates always match what the reminder job will do.
 */
@Service
public class RenewalPreviewService {

    private static final int UPCOMING_COUNT = 4;

    private final UserRepository users;
    private final Clock clock;

    public RenewalPreviewService(UserRepository users, Clock clock) {
        this.users = users;
        this.clock = clock;
    }

    public record UpcomingRenewal(LocalDate date, boolean monthEndAdjusted, String note) {
    }

    public record ReminderPreview(int daysBefore, LocalDate sendDate, boolean willSend) {
    }

    public record RenewalPreview(LocalDate nextRenewalDate, List<UpcomingRenewal> upcoming, List<ReminderPreview> reminders,
            String sendTime, String timeZone) {
    }

    @Transactional(readOnly = true)
    public RenewalPreview preview(Long userId, BillingCycle cycle, LocalDate startDate, LocalDate nextRenewalDate,
            Set<Integer> reminderDays) {
        User user = users.findById(userId).orElseThrow(ApiException::unauthenticated);
        if (nextRenewalDate != null && nextRenewalDate.isBefore(startDate)) {
            throw ApiException.invalidField("nextRenewalDate", "Next renewal can't be before the start date.");
        }
        LocalDate today = user.today(clock);
        LocalDate anchor = RenewalSchedule.chooseAnchor(startDate, cycle, nextRenewalDate);

        LocalDate first = RenewalSchedule.firstRenewal(anchor, cycle, nextRenewalDate, today);
        List<UpcomingRenewal> upcoming = RenewalSchedule.upcoming(anchor, cycle, first, UPCOMING_COUNT).stream()
                .map(date -> {
                    boolean adjusted = RenewalSchedule.isMonthEndAdjusted(anchor, cycle, date);
                    return new UpcomingRenewal(date, adjusted, adjusted ? RenewalSchedule.adjustmentNote(date) : null);
                })
                .toList();
        LocalDate next = upcoming.get(0).date();

        Set<Integer> days = reminderDays != null ? reminderDays : user.getDefaultReminderDays();
        List<ReminderPreview> reminders = days.stream()
                .sorted(Comparator.reverseOrder())
                .map(daysBefore -> {
                    LocalDate sendDate = next.minusDays(daysBefore);
                    // A reminder whose day has already passed is skipped, never sent late.
                    return new ReminderPreview(daysBefore, sendDate, !sendDate.isBefore(today));
                })
                .toList();

        return new RenewalPreview(next, upcoming, reminders, ReminderService.SEND_TIME.toString(), user.getTimeZone());
    }
}
