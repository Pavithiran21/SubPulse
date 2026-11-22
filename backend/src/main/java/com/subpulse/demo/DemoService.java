package com.subpulse.demo;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.auth.AuthSession;
import com.subpulse.auth.SessionService;
import com.subpulse.common.error.ApiException;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/**
 * The demo block on the login page, only when DEMO_MODE=true: the demo account's email and
 * "Log in as User". The demo account is a normal User with is_demo set: the same permissions apply,
 * and it can't change its password or be deleted. The account and its data come from the seed:demo script.
 *
 * The browser never sees the demo password or the demo inbox login: the button sends a role and gets
 * the same session as a log-in. A public page that prints credentials gets flagged as phishing by
 * Google Safe Browsing (it happened to another demo, Nov 2026).
 */
@Service
@ConditionalOnBooleanProperty("app.demo-mode")
public class DemoService {

    public static final String USER_ROLE = "User";
    /** Every demo address uses this reserved domain; MailService sends their emails to the demo inbox. */
    public static final String EMAIL_DOMAIN = "demo.subpulse.test";
    public static final String USER_EMAIL = "user@" + EMAIL_DOMAIN;

    private final UserRepository users;
    private final SessionService sessions;

    public DemoService(UserRepository users, SessionService sessions) {
        this.users = users;
        this.sessions = sessions;
    }

    public record DemoAccount(String role, String email) {
    }

    public record DemoInfo(List<DemoAccount> accounts) {
    }

    public DemoInfo info() {
        return new DemoInfo(List.of(new DemoAccount(USER_ROLE, USER_EMAIL)));
    }

    @Transactional
    public AuthSession login(String role) {
        if (!USER_ROLE.equals(role)) {
            throw ApiException.invalidField("role", "Pick one of the demo roles.");
        }
        User user = users.findByEmail(USER_EMAIL)
                .filter(User::isDemo)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND",
                        "The demo account is not set up. Run seed:demo first."));
        return sessions.start(user);
    }
}
