package com.subpulse.subscription;

import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.subpulse.auth.AuthUser;
import com.subpulse.common.web.PageResponse;
import com.subpulse.subscription.SubscriptionDtos.SubscriptionRequest;
import com.subpulse.subscription.SubscriptionDtos.SubscriptionResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    /** ?q=net&status=ACTIVE or status=PAUSED,CANCELLED,ARCHIVED (History)&category=SOFTWARE&page=1&size=20&sort=-amount */
    @GetMapping
    public PageResponse<SubscriptionResponse> list(@AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Set<SubscriptionStatus> status,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        return subscriptionService.list(user.id(), q, status, category, page, size, sort);
    }

    @GetMapping("/status-counts")
    public Map<SubscriptionStatus, Long> statusCounts(@AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Category category) {
        return subscriptionService.statusCounts(user.id(), q, category);
    }

    @GetMapping("/{id}")
    public SubscriptionResponse get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return subscriptionService.get(user.id(), id);
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> create(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody SubscriptionRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(subscriptionService.create(user.id(), body));
    }

    @PutMapping("/{id}")
    public SubscriptionResponse update(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
            @Valid @RequestBody SubscriptionRequest body) {
        return subscriptionService.update(user.id(), id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        subscriptionService.delete(user.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pause")
    public SubscriptionResponse pause(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return subscriptionService.changeStatus(user.id(), id, StatusAction.PAUSE);
    }

    @PostMapping("/{id}/resume")
    public SubscriptionResponse resume(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return subscriptionService.changeStatus(user.id(), id, StatusAction.RESUME);
    }

    @PostMapping("/{id}/cancel")
    public SubscriptionResponse cancel(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return subscriptionService.changeStatus(user.id(), id, StatusAction.CANCEL);
    }

    @PostMapping("/{id}/archive")
    public SubscriptionResponse archive(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return subscriptionService.changeStatus(user.id(), id, StatusAction.ARCHIVE);
    }

    @PostMapping("/{id}/restore")
    public SubscriptionResponse restore(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return subscriptionService.changeStatus(user.id(), id, StatusAction.RESTORE);
    }
}
