package com.subpulse.reminder;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.subscription.Subscription;

/** The reminder job's own queries on subscriptions. */
public interface ReminderSubscriptionRepository extends Repository<Subscription, Long> {

    /**
     * Active subscriptions whose stored next renewal is on or before the cutoff, in pages ordered
     * by id. "id > afterId" (keyset paging) stays correct while the job changes rows, where
     * OFFSET paging could skip or repeat rows.
     */
    @Query("""
            select new com.subpulse.reminder.ReminderCandidate(
                s.id, s.name, s.amount, s.billingCycle, s.billingAnchorDate, s.nextRenewalDate, s.paymentMethod,
                u.id, u.email, u.timeZone, u.currency, u.remindersEnabled)
            from Subscription s join s.user u
            where s.status = com.subpulse.subscription.SubscriptionStatus.ACTIVE
              and s.nextRenewalDate <= :cutoff
              and s.id > :afterId
            order by s.id
            """)
    List<ReminderCandidate> findCandidates(LocalDate cutoff, Long afterId, Limit limit);

    @Query("select new com.subpulse.reminder.ReminderDay(s.id, d) from Subscription s join s.reminderDays d where s.id in :ids")
    List<ReminderDay> findReminderDays(Collection<Long> ids);

    /**
     * Moves a passed renewal to the next one, only if no one else has moved it already (the
     * "and nextRenewalDate = :current" part). Two overlapping runs compute the same new date from
     * the anchor, and only one of them changes the row.
     */
    @Modifying
    @Transactional
    @Query("""
            update Subscription s set s.nextRenewalDate = :next
            where s.id = :id and s.nextRenewalDate = :current
              and s.status = com.subpulse.subscription.SubscriptionStatus.ACTIVE
            """)
    int advanceNextRenewal(Long id, LocalDate current, LocalDate next);
}
