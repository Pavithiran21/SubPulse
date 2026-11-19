package com.subpulse.user;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    /** IANA zone, for example "Asia/Kolkata". It decides which day is "today" for this user. */
    @Column(name = "time_zone", nullable = false, length = 64)
    private String timeZone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private SupportedCurrency currency;

    @Column(name = "reminders_enabled", nullable = false)
    private boolean remindersEnabled = true;

    @Column(name = "is_demo", nullable = false)
    private boolean demo;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_default_reminder_days", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "days_before", nullable = false)
    private Set<Integer> defaultReminderDays = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(String name, String email, String passwordHash, String timeZone, SupportedCurrency currency,
            Set<Integer> defaultReminderDays) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.timeZone = timeZone;
        this.currency = currency;
        this.defaultReminderDays = new HashSet<>(defaultReminderDays);
    }

    @PrePersist
    void onCreate() {
        // MySQL keeps microseconds; truncating here makes the response match what is stored.
        createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public ZoneId zoneId() {
        return ZoneId.of(timeZone);
    }

    /** The calendar day it is for this user right now, in their own time zone. */
    public LocalDate today(Clock clock) {
        return clock.instant().atZone(zoneId()).toLocalDate();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getTimeZone() {
        return timeZone;
    }

    public void setTimeZone(String timeZone) {
        this.timeZone = timeZone;
    }

    public SupportedCurrency getCurrency() {
        return currency;
    }

    public void setCurrency(SupportedCurrency currency) {
        this.currency = currency;
    }

    public boolean isRemindersEnabled() {
        return remindersEnabled;
    }

    public void setRemindersEnabled(boolean remindersEnabled) {
        this.remindersEnabled = remindersEnabled;
    }

    public boolean isDemo() {
        return demo;
    }

    public void setDemo(boolean demo) {
        this.demo = demo;
    }

    public Set<Integer> getDefaultReminderDays() {
        return defaultReminderDays;
    }

    public void setDefaultReminderDays(Set<Integer> days) {
        defaultReminderDays.clear();
        defaultReminderDays.addAll(days);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
