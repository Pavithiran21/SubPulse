package com.subpulse.reminder;

import java.time.Clock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Runs the reminder job on REMINDER_CRON (every 15 minutes by default; "-" turns it off, which the
 * test environment does so only the tests decide when it runs). Spring never starts this method
 * again while a previous run is still going; an overlapping run from the job endpoint is safe
 * anyway, see ReminderService.
 */
@Component
public class ReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);

    private final ReminderService reminderService;
    private final Clock clock;

    public ReminderJob(ReminderService reminderService, Clock clock) {
        this.reminderService = reminderService;
        this.clock = clock;
    }

    @Scheduled(cron = "${app.reminder-cron}", zone = "UTC")
    public void runOnSchedule() {
        try {
            reminderService.run(clock.instant(), "SCHEDULE");
        } catch (RuntimeException ex) {
            log.error("Reminder job failed", ex);
        }
    }
}
