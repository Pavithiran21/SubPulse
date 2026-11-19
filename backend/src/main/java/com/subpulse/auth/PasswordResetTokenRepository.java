package com.subpulse.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /**
     * Marks the link used only if it is still unused and not expired, in one UPDATE. If two tabs
     * submit the same link at once, only one gets 1 back.
     */
    @Modifying
    @Transactional
    @Query("update PasswordResetToken t set t.usedAt = :now where t.id = :id and t.usedAt is null and t.expiresAt > :now")
    int markUsed(Long id, Instant now);

    @Modifying
    @Transactional
    @Query("delete from PasswordResetToken t where t.userId = :userId")
    int deleteAllForUser(Long userId);

    /** Keeps used and expired links for a day (useful when looking into a support question), then removes them. */
    @Modifying
    @Transactional
    @Query("delete from PasswordResetToken t where t.expiresAt <= :cutoff")
    int deleteExpiredBefore(Instant cutoff);
}
