package com.subpulse.subscription;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.BatchSize;

import com.subpulse.user.User;

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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "subscriptions")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category;

    /** In the user's profile currency. */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 10)
    private BillingCycle billingCycle;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Every renewal is computed from this date; see RenewalSchedule. */
    @Column(name = "billing_anchor_date", nullable = false)
    private LocalDate billingAnchorDate;

    @Column(name = "next_renewal_date", nullable = false)
    private LocalDate nextRenewalDate;

    @Column(name = "payment_method", length = 40)
    private String paymentMethod;

    @Column(length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    @Column(name = "status_changed_at", nullable = false)
    private Instant statusChangedAt;

    /** "Remind me" chips: days before each renewal. Loaded in batches to avoid one query per row. */
    @ElementCollection
    @BatchSize(size = 100)
    @CollectionTable(name = "subscription_reminder_days", joinColumns = @JoinColumn(name = "subscription_id"))
    @Column(name = "days_before", nullable = false)
    private Set<Integer> reminderDays = new HashSet<>();

    /** Optimistic lock: a save based on an old copy fails instead of overwriting a newer change. */
    @Version
    @Column(nullable = false)
    private Integer version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Subscription() {
    }

    public Subscription(User user) {
        this.user = user;
    }

    @PrePersist
    void onCreate() {
        // MySQL keeps microseconds; truncating here makes the response match what is stored.
        createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        updatedAt = createdAt;
        if (statusChangedAt == null) {
            statusChangedAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public void changeStatus(SubscriptionStatus newStatus, Instant at) {
        this.status = newStatus;
        this.statusChangedAt = at;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public BillingCycle getBillingCycle() {
        return billingCycle;
    }

    public void setBillingCycle(BillingCycle billingCycle) {
        this.billingCycle = billingCycle;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getBillingAnchorDate() {
        return billingAnchorDate;
    }

    public void setBillingAnchorDate(LocalDate billingAnchorDate) {
        this.billingAnchorDate = billingAnchorDate;
    }

    public LocalDate getNextRenewalDate() {
        return nextRenewalDate;
    }

    public void setNextRenewalDate(LocalDate nextRenewalDate) {
        this.nextRenewalDate = nextRenewalDate;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public SubscriptionStatus getStatus() {
        return status;
    }

    public Instant getStatusChangedAt() {
        return statusChangedAt;
    }

    public Set<Integer> getReminderDays() {
        return reminderDays;
    }

    public void setReminderDays(Set<Integer> days) {
        reminderDays.clear();
        reminderDays.addAll(days);
    }

    public Integer getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
