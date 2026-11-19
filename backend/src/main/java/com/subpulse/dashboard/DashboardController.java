package com.subpulse.dashboard;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.subpulse.auth.AuthUser;
import com.subpulse.dashboard.DashboardDtos.CalendarResponse;
import com.subpulse.dashboard.DashboardDtos.DashboardResponse;

@RestController
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/api/dashboard")
    public DashboardResponse summary(@AuthenticationPrincipal AuthUser user) {
        return dashboardService.summary(user.id());
    }

    /** ?month=2026-10; without it, the current month in the user's time zone. */
    @GetMapping("/api/calendar")
    public CalendarResponse calendar(@AuthenticationPrincipal AuthUser user, @RequestParam(required = false) String month) {
        return dashboardService.calendar(user.id(), month);
    }
}
