package com.subpulse.reminder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;

import com.subpulse.common.error.DatabaseErrors;
import com.subpulse.mail.MailService;
import com.subpulse.mail.ReminderEmail;
import com.subpulse.renewal.RenewalSchedule;

/**
 * The reminder job (the signature feature). One run, for a given moment "now":
 *
 * 1. Load active subscriptions renewing within the next 8 days (7 days of reminders plus one day
 *    for time zones ahead of UTC), 500 at a time.
 * 2. For each, work out "today" in the owner's time zone.
 * 3. If the stored next renewal has passed, move it to the next one, computed from the anchor.
 * 4. From 9:00 local time, for each chosen "N days before" whose day is today: claim the reminder
 *    by inserting a reminder_logs row, and send the email only if the insert worked.
 *
 * Why it sends each reminder at most once, even when runs overlap or are retried: the claim is
 * committed before the email is sent, and reminder_logs has UNIQUE (subscription, renewal date,
 * days before). The database lets exactly one insert win; every other run gets MySQL error 1062
 * (duplicate key), counts it as a duplicate and moves on. A failed send is marked FAILED and not
 * retried, because the SMTP server may have accepted it even though we saw an error.
 *
 * This method is deliberately not @Transactional: each claim must commit on its own, before its
 * email goes out.
 */
@Service
public class ReminderService {

    /** Reminders go out from 9:00 in the user's time zone (the design's "at 9:00 am"). */
    public static final LocalTime SEND_TIME = LocalTime.of(9, 0);
    /** Largest "days before" choice (7) plus one day for zones ahead of UTC. */
    private static final int LOOKAHEAD_DAYS = 8;
    private static final int PAGE_SIZE = 500;

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final ReminderSubscriptionRepository candidates;
    private final ReminderLogRepository reminderLogs;
    private final JobRunRepository jobRuns;
    private final MailService mailService;
    private final Clock clock;

    public ReminderService(ReminderSubscriptionRepository candidates, ReminderLogRepository reminderLogs,
            JobRunRepository jobRuns, MailService mailService, Clock clock) {
        this.candidates = candidates;
        this.reminderLogs = reminderLogs;
        this.jobRuns = jobRuns;
        this.mailService = mailService;
        this.clock = clock;
    }

    public JobRunSummary run(Instant now, String trigger) {
        String runId = UUID.randomUUID().toString();
        JobRun jobRun = jobRuns.save(JobRun.start(runId, trigger, now, clock.instant()));
        Counters counters = new Counters();
        String finalStatus = "FAILED";
        try {
            LocalDate cutoff = now.atZone(ZoneOffset.UTC).toLocalDate().plusDays(LOOKAHEAD_DAYS);
            long afterId = 0;
            List<ReminderCandidate> page = candidates.findCandidates(cutoff, afterId, Limit.of(PAGE_SIZE));
            while (!page.isEmpty()) {
                Map<Long, Set<Integer>> reminderDays = loadReminderDays(page);
                for (ReminderCandidate candidate : page) {
                    process(candidate, reminderDays.getOrDefault(candidate.subscriptionId(), Set.of()), now, counters);
                }
                afterId = page.get(page.size() - 1).subscriptionId();
                page = candidates.findCandidates(cutoff, afterId, Limit.of(PAGE_SIZE));
            }
            finalStatus = "FINISHED";
        } finally {
            JobRunSummary summary = counters.toSummary(runId, now);
            jobRun.finish(finalStatus, summary, clock.instant());
            jobRuns.save(jobRun);
            log.info("Reminder job {} {} (as of {}): checked={}, sent={}, duplicates={}, advanced={}, emailFailures={}",
                    runId, finalStatus.toLowerCase(), now, summary.subscriptionsChecked(), summary.remindersSent(),
                    summary.duplicatesSkipped(), summary.renewalsAdvanced(), summary.emailFailures());
        }
        return counters.toSummary(runId, now);
    }

    private void process(ReminderCandidate candidate, Set<Integer> daysBefore, Instant now, Counters counters) {
        counters.checked++;
        ZonedDateTime localNow = now.atZone(ZoneId.of(candidate.timeZone()));
        LocalDate today = localNow.toLocalDate();

        LocalDate renewal = candidate.nextRenewalDate();
        if (renewal.isBefore(today)) {
            LocalDate next = RenewalSchedule.nextOnOrAfter(candidate.anchorDate(), candidate.billingCycle(), today);
            if (candidates.advanceNextRenewal(candidate.subscriptionId(), renewal, next) == 1) {
                counters.advanced++;
            }
            renewal = next;
        }

        if (!candidate.remindersEnabled() || localNow.toLocalTime().isBefore(SEND_TIME)) {
            return;
        }
        for (int days : daysBefore) {
            if (renewal.minusDays(days).equals(today)) {
                claimAndSend(candidate, renewal, days, daysBefore, counters);
            }
        }
    }

    private void claimAndSend(ReminderCandidate candidate, LocalDate renewal, int days, Set<Integer> chosenDays,
            Counters counters) {
        ReminderLog claim;
        try {
            // saveAndFlush runs in its own transaction and commits before we send anything.
            claim = reminderLogs.saveAndFlush(ReminderLog.claim(candidate.subscriptionId(), renewal, days, clock.instant()));
        } catch (DataIntegrityViolationException ex) {
            if (DatabaseErrors.isDuplicateKey(ex)) {
                counters.duplicates++;
            } else {
                // The subscription was deleted while the job was running (foreign key).
                log.info("Reminder for subscription {} skipped: it no longer exists", candidate.subscriptionId());
            }
            return;
        }

        ReminderEmail email = new ReminderEmail(candidate.userId(), candidate.email(), candidate.subscriptionId(),
                candidate.name(), candidate.currency().format(candidate.amount()), renewal,
                candidate.billingCycle().label(), candidate.paymentMethod(), days, chosenDays);
        if (mailService.sendRenewalReminder(email)) {
            reminderLogs.markSent(claim.getId(), clock.instant());
            counters.sent++;
        } else {
            reminderLogs.markFailed(claim.getId(), "SMTP_SEND_FAILED");
            counters.emailFailures++;
        }
    }

    private Map<Long, Set<Integer>> loadReminderDays(List<ReminderCandidate> page) {
        List<Long> ids = page.stream().map(ReminderCandidate::subscriptionId).toList();
        Map<Long, Set<Integer>> bySubscription = new HashMap<>();
        for (ReminderDay day : candidates.findReminderDays(ids)) {
            bySubscription.computeIfAbsent(day.subscriptionId(), id -> new HashSet<>()).add(day.daysBefore());
        }
        return bySubscription;
    }

    /** Running totals for one run. */
    private static final class Counters {
        int checked;
        int sent;
        int duplicates;
        int advanced;
        int emailFailures;

        JobRunSummary toSummary(String runId, Instant asOf) {
            return new JobRunSummary(runId, asOf, checked, sent, duplicates, advanced, emailFailures);
        }
    }
}
