package com.subpulse.reminder;

/** SENDING: claimed, email on its way. SENT: delivered to SMTP. FAILED: SMTP refused it (not retried). */
public enum ReminderLogStatus {
    SENDING,
    SENT,
    FAILED
}
