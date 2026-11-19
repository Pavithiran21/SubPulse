package com.subpulse.subscription;

import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.common.error.ApiException;
import com.subpulse.common.web.PageQuery;
import com.subpulse.common.web.PageResponse;
import com.subpulse.renewal.RenewalSchedule;
import com.subpulse.subscription.SubscriptionDtos.SubscriptionRequest;
import com.subpulse.subscription.SubscriptionDtos.SubscriptionResponse;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/**
 * Subscriptions of the logged-in user. Every method takes the user id from the access token and
 * loads rows with it, so another user's subscription is simply "not found" (404), never visible.
 */
@Service
public class SubscriptionService {

    public static final List<String> SORT_FIELDS = List.of("name", "amount", "nextRenewalDate", "statusChangedAt", "createdAt");
    private static final String DEFAULT_SORT = "nextRenewalDate";
    private static final LocalDate EARLIEST_START = LocalDate.of(2000, 1, 1);
    private static final int MAX_YEARS_AHEAD = 10;
    private static final int MAX_SEARCH_LENGTH = 80;

    private final SubscriptionRepository subscriptions;
    private final UserRepository users;
    private final Clock clock;

    public SubscriptionService(SubscriptionRepository subscriptions, UserRepository users, Clock clock) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<SubscriptionResponse> list(Long userId, String search, Set<SubscriptionStatus> statuses,
            Category category, Integer page, Integer size, String sort) {
        User user = loadUser(userId);
        Pageable pageable = PageQuery.toPageable(page, size, sort, SORT_FIELDS, DEFAULT_SORT);

        Specification<Subscription> filter = SubscriptionSpecs.ownedBy(userId);
        if (statuses != null && !statuses.isEmpty()) {
            filter = filter.and(SubscriptionSpecs.statusIn(statuses));
        }
        if (category != null) {
            filter = filter.and(SubscriptionSpecs.hasCategory(category));
        }
        if (hasText(search)) {
            filter = filter.and(SubscriptionSpecs.nameContains(checkSearch(search)));
        }

        Page<Subscription> result = subscriptions.findAll(filter, pageable);
        LocalDate today = user.today(clock);
        return PageResponse.of(result, s -> SubscriptionResponse.from(s, user.getCurrency(), today));
    }

    /** Counts for the Active, Paused, Cancelled and Archived tabs; every status is present, even at 0. */
    @Transactional(readOnly = true)
    public Map<SubscriptionStatus, Long> statusCounts(Long userId, String search, Category category) {
        String pattern = hasText(search) ? SubscriptionSpecs.likePattern(checkSearch(search)) : null;
        Map<SubscriptionStatus, Long> counts = new EnumMap<>(SubscriptionStatus.class);
        for (SubscriptionStatus status : SubscriptionStatus.values()) {
            counts.put(status, 0L);
        }
        for (StatusCount row : subscriptions.countByStatus(userId, category, pattern)) {
            counts.put(row.status(), row.count());
        }
        return counts;
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse get(Long userId, Long id) {
        User user = loadUser(userId);
        return SubscriptionResponse.from(loadOwned(userId, id), user.getCurrency(), user.today(clock));
    }

    @Transactional
    public SubscriptionResponse create(Long userId, SubscriptionRequest request) {
        User user = loadUser(userId);
        LocalDate today = user.today(clock);
        Subscription subscription = new Subscription(user);
        applyRequest(subscription, request, today, null);
        subscription.setReminderDays(request.reminderDays() != null ? request.reminderDays() : user.getDefaultReminderDays());
        subscriptions.save(subscription);
        return SubscriptionResponse.from(subscription, user.getCurrency(), today);
    }

    /**
     * The client sends the version it loaded. If the row changed since (another tab, a status
     * change), the save is refused with 409 instead of silently overwriting the newer data.
     */
    @Transactional
    public SubscriptionResponse update(Long userId, Long id, SubscriptionRequest request) {
        User user = loadUser(userId);
        Subscription subscription = loadOwned(userId, id);
        if (request.version() == null) {
            throw ApiException.invalidField("version", "Reload the subscription and try again.");
        }
        if (!request.version().equals(subscription.getVersion())) {
            throw new ApiException(HttpStatus.CONFLICT, "CONCURRENT_UPDATE",
                    "This subscription was changed somewhere else. Reload it and try again.");
        }
        LocalDate today = user.today(clock);
        applyRequest(subscription, request, today, scheduleUnchanged(subscription, request) ? subscription.getBillingAnchorDate() : null);
        if (request.reminderDays() != null) {
            subscription.setReminderDays(request.reminderDays());
        }
        subscriptions.flush();
        return SubscriptionResponse.from(subscription, user.getCurrency(), today);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        subscriptions.delete(loadOwned(userId, id));
    }

    /** Pause, resume, cancel, archive or restore. Back to ACTIVE means the next renewal from today. */
    @Transactional
    public SubscriptionResponse changeStatus(Long userId, Long id, StatusAction action) {
        User user = loadUser(userId);
        Subscription subscription = loadOwned(userId, id);
        SubscriptionStatus current = subscription.getStatus();
        if (!action.isAllowedFrom(current)) {
            String status = current.name().toLowerCase();
            String article = status.matches("^[aeiou].*") ? "an" : "a";
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "ILLEGAL_STATUS_CHANGE",
                    "Can't " + action.verb() + " " + article + " " + status + " subscription.");
        }
        LocalDate today = user.today(clock);
        subscription.changeStatus(action.target(), clock.instant().truncatedTo(ChronoUnit.MICROS));
        if (action.target() == SubscriptionStatus.ACTIVE) {
            subscription.setNextRenewalDate(RenewalSchedule.nextOnOrAfter(
                    subscription.getBillingAnchorDate(), subscription.getBillingCycle(), today));
        }
        subscriptions.flush();
        return SubscriptionResponse.from(subscription, user.getCurrency(), today);
    }

    /**
     * True when an edit leaves the schedule alone: same start date and cycle, and either no next
     * renewal (a paused subscription has none to send back) or the stored one. The stored anchor
     * must then be kept: re-choosing it would lose a billing day the user moved, or turn a clamped
     * date such as 30 November into the new anchor and drift every later renewal to the 30th.
     */
    private static boolean scheduleUnchanged(Subscription subscription, SubscriptionRequest request) {
        return request.startDate().equals(subscription.getStartDate())
                && request.billingCycle() == subscription.getBillingCycle()
                && (request.nextRenewalDate() == null || request.nextRenewalDate().equals(subscription.getNextRenewalDate()));
    }

    /**
     * Copies the fields and works out the anchor and the next renewal (see RenewalSchedule).
     * A future next renewal chosen by the user is kept; a past one moves to the first renewal on
     * or after today. keptAnchor is the stored anchor when an edit doesn't change the schedule,
     * otherwise null and the anchor is chosen again.
     */
    private void applyRequest(Subscription subscription, SubscriptionRequest request, LocalDate today, LocalDate keptAnchor) {
        LocalDate latest = today.plusYears(MAX_YEARS_AHEAD);
        if (request.startDate().isBefore(EARLIEST_START) || request.startDate().isAfter(latest)) {
            throw ApiException.invalidField("startDate", "Enter a valid date.");
        }
        if (request.nextRenewalDate() != null) {
            if (request.nextRenewalDate().isBefore(request.startDate())) {
                throw ApiException.invalidField("nextRenewalDate", "Next renewal can't be before the start date.");
            }
            if (request.nextRenewalDate().isAfter(latest)) {
                throw ApiException.invalidField("nextRenewalDate", "Enter a valid date.");
            }
        }

        subscription.setName(request.name().trim());
        subscription.setCategory(request.category());
        subscription.setAmount(request.amount().setScale(2, RoundingMode.UNNECESSARY));
        subscription.setBillingCycle(request.billingCycle());
        subscription.setStartDate(request.startDate());
        subscription.setPaymentMethod(blankToNull(request.paymentMethod()));
        subscription.setNotes(blankToNull(request.notes()));

        LocalDate anchor = keptAnchor != null ? keptAnchor
                : RenewalSchedule.chooseAnchor(request.startDate(), request.billingCycle(), request.nextRenewalDate());
        subscription.setBillingAnchorDate(anchor);
        subscription.setNextRenewalDate(
                RenewalSchedule.firstRenewal(anchor, request.billingCycle(), request.nextRenewalDate(), today));
    }

    private Subscription loadOwned(Long userId, Long id) {
        return subscriptions.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.notFound("Subscription"));
    }

    private User loadUser(Long userId) {
        return users.findById(userId).orElseThrow(ApiException::unauthenticated);
    }

    private static String checkSearch(String search) {
        if (search.length() > MAX_SEARCH_LENGTH) {
            throw ApiException.invalidField("q", "Use at most " + MAX_SEARCH_LENGTH + " characters.");
        }
        return search;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }
}
