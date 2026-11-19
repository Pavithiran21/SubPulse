package com.subpulse.reminder;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One reminder email for one renewal. The table's UNIQUE (subscription_id, renewal_date,
 * days_before) is what makes each reminder go out at most once.
 */
@Entity
@Table(name = "reminder_logs")
public class ReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subscription_id", nullable = false)
    private Long subscriptionId;

    @Column(name = "renewal_date", nullable = false)
    private LocalDate renewalDate;

    @Column(name = "days_before", nullable = false)
    private Integer daysBefore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ReminderLogStatus status;

    @Column(name = "error_code", length = 60)
    private String errorCode;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    protected ReminderLog() {
    }

    /** A claim: inserted before the email is sent. */
    public static ReminderLog claim(Long subscriptionId, LocalDate renewalDate, int daysBefore, Instant now) {
        ReminderLog log = new ReminderLog();
        log.subscriptionId = subscriptionId;
        log.renewalDate = renewalDate;
        log.daysBefore = daysBefore;
        log.status = ReminderLogStatus.SENDING;
        log.createdAt = now;
        return log;
    }

    public Long getId() {
        return id;
    }
}
