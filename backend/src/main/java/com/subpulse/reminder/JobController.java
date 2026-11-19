package com.subpulse.reminder;

import java.time.Clock;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.subpulse.auth.TokenHashing;
import com.subpulse.common.error.ApiException;
import com.subpulse.config.AppProperties;

/**
 * Runs the reminder job on demand: by hand (scripts/run-job.ps1), from tests, or from an external
 * cron on a host that sleeps. Only callers with the job secret may use it.
 *
 * Body {"at": "2027-02-25T04:00:00Z"} runs the job as if it were that moment, so tests and demos
 * can check "3 days before the renewal" without waiting. It is accepted only when
 * JOB_TIME_OVERRIDE_ENABLED=true, which StartupConfigCheck refuses in production.
 */
@RestController
public class JobController {

    private final ReminderService reminderService;
    private final AppProperties props;
    private final Clock clock;

    public JobController(ReminderService reminderService, AppProperties props, Clock clock) {
        this.reminderService = reminderService;
        this.props = props;
        this.clock = clock;
    }

    public record RunJobRequest(Instant at) {
    }

    @PostMapping("/api/internal/jobs/reminders")
    public JobRunSummary runReminders(@RequestHeader(name = "X-Job-Secret", required = false) String secret,
            @RequestBody(required = false) RunJobRequest body) {
        if (!TokenHashing.secretsMatch(secret, props.jobTriggerSecret())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "JOB_SECRET_INVALID", "The job secret is missing or wrong.");
        }
        Instant at = body == null ? null : body.at();
        if (at != null && !props.jobTimeOverrideEnabled()) {
            throw ApiException.invalidField("at", "Running the job at another time is turned off on this server.");
        }
        return reminderService.run(at != null ? at : clock.instant(), "API");
    }
}
