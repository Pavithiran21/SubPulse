-- SubPulse schema, version 1.
-- Instants are DATETIME(6) in UTC (the server runs at +00:00 and Hibernate writes UTC).
-- Calendar dates (start, anchor, renewal) are DATE: they are days in the user's own time zone.
-- Money is DECIMAL(12,2), never a floating-point type.
-- Every user-owned row is removed with ON DELETE CASCADE when the user deletes their account.

CREATE TABLE users (
    id                BIGINT       NOT NULL AUTO_INCREMENT,
    name              VARCHAR(80)  NOT NULL,
    email             VARCHAR(254) NOT NULL,
    password_hash     VARCHAR(72)  NOT NULL,
    time_zone         VARCHAR(64)  NOT NULL,
    currency          VARCHAR(3)   NOT NULL,
    reminders_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
    is_demo           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        DATETIME(6)  NOT NULL,
    updated_at        DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- The reminder chips a new subscription starts with (Settings > Default reminders).
CREATE TABLE user_default_reminder_days (
    user_id     BIGINT NOT NULL,
    days_before INT    NOT NULL,
    PRIMARY KEY (user_id, days_before),
    CONSTRAINT chk_user_default_reminder_days CHECK (days_before IN (0, 1, 3, 5, 7)),
    CONSTRAINT fk_user_default_reminder_days_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE subscriptions (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    user_id             BIGINT        NOT NULL,
    name                VARCHAR(80)   NOT NULL,
    category            VARCHAR(20)   NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    billing_cycle       VARCHAR(10)   NOT NULL,
    start_date          DATE          NOT NULL,
    -- Every renewal is computed from this date (see RenewalSchedule), never from the last renewal.
    billing_anchor_date DATE          NOT NULL,
    -- Kept up to date by the reminder job; stored so the list can sort and filter on it.
    next_renewal_date   DATE          NOT NULL,
    payment_method      VARCHAR(40)   NULL,
    notes               VARCHAR(500)  NULL,
    status              VARCHAR(10)   NOT NULL,
    status_changed_at   DATETIME(6)   NOT NULL,
    version             INT           NOT NULL DEFAULT 0,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_subscriptions_amount CHECK (amount > 0),
    CONSTRAINT chk_subscriptions_category CHECK (category IN ('ENTERTAINMENT', 'MUSIC', 'SOFTWARE', 'CLOUD_STORAGE',
        'FITNESS', 'NEWS', 'EDUCATION', 'UTILITIES', 'OTHER')),
    CONSTRAINT chk_subscriptions_cycle CHECK (billing_cycle IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    CONSTRAINT chk_subscriptions_status CHECK (status IN ('ACTIVE', 'PAUSED', 'CANCELLED', 'ARCHIVED')),
    CONSTRAINT chk_subscriptions_anchor CHECK (billing_anchor_date >= start_date),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_subscriptions_user_status_renewal (user_id, status, next_renewal_date),
    INDEX idx_subscriptions_status_renewal (status, next_renewal_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- When to remind: "Same day" (0), 1, 3, 5 or 7 days before each renewal.
CREATE TABLE subscription_reminder_days (
    subscription_id BIGINT NOT NULL,
    days_before     INT    NOT NULL,
    PRIMARY KEY (subscription_id, days_before),
    CONSTRAINT chk_subscription_reminder_days CHECK (days_before IN (0, 1, 3, 5, 7)),
    CONSTRAINT fk_subscription_reminder_days_subscription FOREIGN KEY (subscription_id)
        REFERENCES subscriptions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- One row per reminder email. The UNIQUE key is the exactly-once guarantee: the job inserts the
-- row before sending, so a re-run or an overlapping run gets a duplicate-key error and skips it.
CREATE TABLE reminder_logs (
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    subscription_id BIGINT      NOT NULL,
    renewal_date    DATE        NOT NULL,
    days_before     INT         NOT NULL,
    status          VARCHAR(10) NOT NULL,
    error_code      VARCHAR(60) NULL,
    created_at      DATETIME(6) NOT NULL,
    sent_at         DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_reminder_logs_once UNIQUE (subscription_id, renewal_date, days_before),
    CONSTRAINT chk_reminder_logs_status CHECK (status IN ('SENDING', 'SENT', 'FAILED')),
    CONSTRAINT fk_reminder_logs_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Only the SHA-256 of each token is stored, so a database leak can't be replayed as a login.
CREATE TABLE refresh_tokens (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    user_id    BIGINT      NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_expires (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE password_reset_tokens (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    user_id    BIGINT      NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at    DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_password_reset_tokens_expires (expires_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- One summary row per reminder-job run: counts only, never an email address.
CREATE TABLE job_runs (
    id                    BIGINT      NOT NULL AUTO_INCREMENT,
    run_id                VARCHAR(36) NOT NULL,
    trigger_type          VARCHAR(10) NOT NULL,
    status                VARCHAR(10) NOT NULL,
    as_of                 DATETIME(6) NOT NULL,
    started_at            DATETIME(6) NOT NULL,
    finished_at           DATETIME(6) NULL,
    subscriptions_checked INT         NOT NULL DEFAULT 0,
    reminders_sent        INT         NOT NULL DEFAULT 0,
    duplicates_skipped    INT         NOT NULL DEFAULT 0,
    renewals_advanced     INT         NOT NULL DEFAULT 0,
    email_failures        INT         NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT uq_job_runs_run_id UNIQUE (run_id),
    CONSTRAINT chk_job_runs_trigger CHECK (trigger_type IN ('SCHEDULE', 'API')),
    CONSTRAINT chk_job_runs_status CHECK (status IN ('RUNNING', 'FINISHED', 'FAILED'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
