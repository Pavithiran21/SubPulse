package com.subpulse.renewal;

import java.time.LocalDate;
import java.util.Set;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.subpulse.auth.AuthUser;
import com.subpulse.common.validation.ValidReminderDays;
import com.subpulse.renewal.RenewalPreviewService.RenewalPreview;
import com.subpulse.subscription.BillingCycle;

@RestController
public class RenewalPreviewController {

    private final RenewalPreviewService previewService;

    public RenewalPreviewController(RenewalPreviewService previewService) {
        this.previewService = previewService;
    }

    /** GET /api/renewals/preview?billingCycle=MONTHLY&startDate=2026-01-31&nextRenewalDate=2026-10-31&reminderDays=7,3,1 */
    @GetMapping("/api/renewals/preview")
    public RenewalPreview preview(@AuthenticationPrincipal AuthUser user,
            @RequestParam BillingCycle billingCycle,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate nextRenewalDate,
            @RequestParam(required = false) @ValidReminderDays Set<Integer> reminderDays) {
        return previewService.preview(user.id(), billingCycle, startDate, nextRenewalDate, reminderDays);
    }
}
