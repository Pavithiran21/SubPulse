package com.subpulse.reminder;

import java.time.Instant;

/** What one run did; returned by the job endpoint and written to the log and the job_runs table. */
public record JobRunSummary(
        String runId,
        Instant asOf,
        int subscriptionsChecked,
        int remindersSent,
        int duplicatesSkipped,
        int renewalsAdvanced,
        int emailFailures) {
}
