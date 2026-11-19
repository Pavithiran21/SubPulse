package com.subpulse.reminder;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The summary of one reminder-job run: counts only, never an email address. */
@Entity
@Table(name = "job_runs")
public class JobRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false, length = 36)
    private String runId;

    @Column(name = "trigger_type", nullable = false, length = 10)
    private String triggerType;

    @Column(nullable = false, length = 10)
    private String status;

    /** The moment the run worked for: real time, or the simulated time given to the job endpoint. */
    @Column(name = "as_of", nullable = false)
    private Instant asOf;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "subscriptions_checked", nullable = false)
    private int subscriptionsChecked;

    @Column(name = "reminders_sent", nullable = false)
    private int remindersSent;

    @Column(name = "duplicates_skipped", nullable = false)
    private int duplicatesSkipped;

    @Column(name = "renewals_advanced", nullable = false)
    private int renewalsAdvanced;

    @Column(name = "email_failures", nullable = false)
    private int emailFailures;

    protected JobRun() {
    }

    public static JobRun start(String runId, String triggerType, Instant asOf, Instant startedAt) {
        JobRun run = new JobRun();
        run.runId = runId;
        run.triggerType = triggerType;
        run.status = "RUNNING";
        run.asOf = asOf;
        run.startedAt = startedAt;
        return run;
    }

    public void finish(String finalStatus, JobRunSummary counts, Instant finishedAt) {
        this.status = finalStatus;
        this.finishedAt = finishedAt;
        this.subscriptionsChecked = counts.subscriptionsChecked();
        this.remindersSent = counts.remindersSent();
        this.duplicatesSkipped = counts.duplicatesSkipped();
        this.renewalsAdvanced = counts.renewalsAdvanced();
        this.emailFailures = counts.emailFailures();
    }
}
