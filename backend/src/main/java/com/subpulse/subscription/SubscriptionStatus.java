package com.subpulse.subscription;

/**
 * Only ACTIVE subscriptions get reminders and count in spend. The allowed changes are in
 * {@link SubscriptionService}: pause, resume, cancel, archive and restore.
 */
public enum SubscriptionStatus {
    ACTIVE,
    PAUSED,
    CANCELLED,
    ARCHIVED
}
