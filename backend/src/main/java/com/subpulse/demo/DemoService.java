package com.subpulse.demo;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.subpulse.auth.AuthSession;
import com.subpulse.auth.SessionService;
import com.subpulse.common.error.ApiException;
import com.subpulse.config.AppProperties;
import com.subpulse.user.User;
import com.subpulse.user.UserRepository;

/**
 * The demo block on the login page, only when DEMO_MODE=true: the demo account's email and
 * password, the Ethereal inbox its emails go to, and "Log in as User". The demo account is a normal
 * User with is_demo set: the same permissions apply, and it can't change its password or be deleted.
 * The account and its data come from the seed:demo script.
 *
 * The password (DEMO_PASSWORD) and the inbox login are shown on purpose: both are demo-only and
 * also listed in the README.
 */
@Service
@ConditionalOnBooleanProperty("app.demo-mode")
public class DemoService {

    public static final String USER_ROLE = "User";
    /** Every demo address uses this reserved domain; MailService sends their emails to the demo inbox. */
    public static final String EMAIL_DOMAIN = "demo.subpulse.test";
    public static final String USER_EMAIL = "user@" + EMAIL_DOMAIN;
    private static final String INBOX_URL = "https://ethereal.email/login";

    private final UserRepository users;
    private final SessionService sessions;
    private final AppProperties props;

    public DemoService(UserRepository users, SessionService sessions, AppProperties props) {
        this.users = users;
        this.sessions = sessions;
        this.props = props;
    }

    public record DemoAccount(String role, String email, String password) {
    }

    public record DemoInbox(String url, String user, String pass) {
    }

    public record DemoInfo(List<DemoAccount> accounts, DemoInbox inbox) {
    }

    public DemoInfo info() {
        DemoAccount user = new DemoAccount(USER_ROLE, USER_EMAIL, props.demoPassword());
        DemoInbox inbox = new DemoInbox(INBOX_URL, props.demoSmtp().user(), props.demoSmtp().pass());
        return new DemoInfo(List.of(user), inbox);
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
