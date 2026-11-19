package com.subpulse.reminder;

import java.time.Instant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface ReminderLogRepository extends JpaRepository<ReminderLog, Long> {

    @Modifying
    @Transactional
    @Query("update ReminderLog r set r.status = com.subpulse.reminder.ReminderLogStatus.SENT, r.sentAt = :sentAt where r.id = :id")
    int markSent(Long id, Instant sentAt);

    @Modifying
    @Transactional
    @Query("update ReminderLog r set r.status = com.subpulse.reminder.ReminderLogStatus.FAILED, r.errorCode = :errorCode where r.id = :id")
    int markFailed(Long id, String errorCode);
}
