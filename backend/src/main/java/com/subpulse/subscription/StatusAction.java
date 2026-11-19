package com.subpulse.subscription;

import java.util.Set;

/**
 * The status changes a user can make, and which statuses each one starts from:
 * pause (active), resume (paused), cancel (active or paused), archive (anything not archived),
 * restore (cancelled or archived). Anything else is a 422 ILLEGAL_STATUS_CHANGE.
 */
public enum StatusAction {
    PAUSE("pause", SubscriptionStatus.PAUSED, Set.of(SubscriptionStatus.ACTIVE)),
    RESUME("resume", SubscriptionStatus.ACTIVE, Set.of(SubscriptionStatus.PAUSED)),
    CANCEL("cancel", SubscriptionStatus.CANCELLED, Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED)),
    ARCHIVE("archive", SubscriptionStatus.ARCHIVED,
            Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED)),
    RESTORE("restore", SubscriptionStatus.ACTIVE, Set.of(SubscriptionStatus.CANCELLED, SubscriptionStatus.ARCHIVED));

    private final String verb;
    private final SubscriptionStatus target;
    private final Set<SubscriptionStatus> allowedFrom;

    StatusAction(String verb, SubscriptionStatus target, Set<SubscriptionStatus> allowedFrom) {
        this.verb = verb;
        this.target = target;
        this.allowedFrom = allowedFrom;
    }

    public String verb() {
        return verb;
    }

    public SubscriptionStatus target() {
        return target;
    }

    public boolean isAllowedFrom(SubscriptionStatus status) {
        return allowedFrom.contains(status);
    }
}
