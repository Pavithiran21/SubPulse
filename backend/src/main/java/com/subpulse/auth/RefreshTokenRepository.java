package com.subpulse.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Deletes one token and reports whether this call deleted it. Two refreshes racing with the
     * same cookie both find the row, but only one gets 1 back: the other is refused.
     */
    @Modifying
    @Transactional
    @Query("delete from RefreshToken t where t.id = :id")
    int deleteByIdReturningCount(Long id);

    @Modifying
    @Transactional
    @Query("delete from RefreshToken t where t.tokenHash = :tokenHash")
    int deleteByTokenHash(String tokenHash);

    @Modifying
    @Transactional
    @Query("delete from RefreshToken t where t.userId = :userId")
    int deleteAllForUser(Long userId);

    @Modifying
    @Transactional
    @Query("delete from RefreshToken t where t.expiresAt <= :now")
    int deleteExpired(Instant now);
}
