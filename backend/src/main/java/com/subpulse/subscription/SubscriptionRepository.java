package com.subpulse.subscription;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

/**
 * Every query takes the owner's id, so one user's request can never load another user's row.
 * The list endpoint builds its filters with {@link SubscriptionSpecs}.
 */
public interface SubscriptionRepository extends JpaRepository<Subscription, Long>, JpaSpecificationExecutor<Subscription> {

    Optional<Subscription> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserId(Long userId);

    List<Subscription> findByUserIdAndStatusIn(Long userId, Collection<SubscriptionStatus> statuses);

    /** Counts per status for the list tabs, with the same search and category filter as the list. */
    @Query("""
            select new com.subpulse.subscription.StatusCount(s.status, count(s))
            from Subscription s
            where s.user.id = :userId
              and (:category is null or s.category = :category)
              and (:namePattern is null or lower(s.name) like :namePattern escape '\\')
            group by s.status
            """)
    List<StatusCount> countByStatus(Long userId, Category category, String namePattern);
}
