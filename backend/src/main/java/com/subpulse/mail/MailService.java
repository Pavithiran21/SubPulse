package com.subpulse.mail;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import com.subpulse.auth.PasswordResetService;
import com.subpulse.config.AppProperties;
import com.subpulse.demo.DemoService;
import com.subpulse.user.User;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Sends SubPulse's two emails through plain SMTP (Ethereal in development and tests, Brevo for
 * real mail; only the SMTP_* values in .env differ). HTML comes from Thymeleaf templates, which
 * escape every value; a plain-text part is included for mail clients that don't show HTML.
 *
 * Demo addresses (@demo.subpulse.test) never exist, so their emails go to the demo Ethereal inbox
 * (DEMO_SMTP_*) instead, and never through Brevo; without a demo inbox they are not sent.
 *
 * Sending never throws: it returns false and logs the user id and the error type only,
 * never the address or the content.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final String LOGO_CID = "logo@subpulse";
    private static final ClassPathResource LOGO = new ClassPathResource("mail/logo.png");
    private static final String DEMO_ADDRESS_SUFFIX = "@" + DemoService.EMAIL_DOMAIN;

    private final JavaMailSender mailSender;
    private final DemoMailSender demoMailSender;
    private final ITemplateEngine templates;
    private final AppProperties props;

    public MailService(JavaMailSender mailSender, DemoMailSender demoMailSender, ITemplateEngine templates,
            AppProperties props) {
        this.mailSender = mailSender;
        this.demoMailSender = demoMailSender;
        this.templates = templates;
        this.props = props;
    }

    public boolean sendPasswordReset(User user, String token) {
        String link = props.frontendUrl() + "/reset-password?token=" + token;
        long minutes = PasswordResetService.LINK_LIFETIME.toMinutes();

        Context context = new Context();
        context.setVariable("email", user.getEmail());
        context.setVariable("link", link);
        context.setVariable("minutes", minutes);
        String html = templates.process("mail/password-reset", context);
        String text = "Reset your SubPulse password\n\n"
                + "We got a request to reset the password for " + user.getEmail() + ".\n"
                + "Open this link to set a new one. It works once and expires in " + minutes + " minutes:\n"
                + link + "\n\n"
                + "If you didn't ask for this, ignore this email. Your password stays the same.\n";

        return send("password_reset", user.getId(), user.getEmail(), "Reset your SubPulse password", html, text);
    }

    public boolean sendRenewalReminder(ReminderEmail email) {
        String subject = MailText.reminderSubject(email.subscriptionName(), email.daysBefore());
        String renewsOn = MailText.longDate(email.renewalDate());
        String billing = email.paymentMethod() == null || email.paymentMethod().isBlank()
                ? email.cycleLabel()
                : email.cycleLabel() + " · " + email.paymentMethod();
        String advice = MailText.cancelAdvice(email.subscriptionName(), email.renewalDate(), email.daysBefore());
        String chosen = "You chose reminders " + MailText.chosenDaysText(email.chosenDays()) + ".";
        String viewLink = props.frontendUrl() + "/subscriptions/" + email.subscriptionId();
        String settingsLink = props.frontendUrl() + "/settings";

        Context context = new Context();
        context.setVariable("title", subject);
        context.setVariable("amount", email.amountText());
        context.setVariable("renewsOn", renewsOn);
        context.setVariable("billing", billing);
        context.setVariable("advice", advice);
        context.setVariable("chosen", chosen);
        context.setVariable("viewLink", viewLink);
        context.setVariable("settingsLink", settingsLink);
        String html = templates.process("mail/renewal-reminder", context);
        String text = subject + "\n\n"
                + "Amount: " + email.amountText() + "\n"
                + "Renews on: " + renewsOn + "\n"
                + "Billing: " + billing + "\n\n"
                + advice + "\n\n"
                + "View subscription: " + viewLink + "\n\n"
                + chosen + " Change reminder settings: " + settingsLink + "\n";

        return send("renewal_reminder", email.userId(), email.to(), subject, html, text);
    }

    private boolean send(String type, Long userId, String to, String subject, String html, String text) {
        JavaMailSender sender = mailSender;
        if (isDemoAddress(to)) {
            if (!demoMailSender.isConfigured()) {
                log.warn("Email not sent: type={}, userId={}, error=DemoInboxNotConfigured (set DEMO_SMTP_*)",
                        type, userId);
                return false;
            }
            sender = demoMailSender.sender();
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(props.mailFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, html);
            helper.addInline(LOGO_CID, LOGO, "image/png");
            sender.send(message);
            return true;
        } catch (MailException | MessagingException ex) {
            // Class names only: an SMTP error message can quote the recipient's address. The cause
            // tells a timeout from a refused login or a TLS failure.
            log.warn("Email not sent: type={}, userId={}, error={}, cause={}", type, userId,
                    ex.getClass().getSimpleName(), rootCauseName(ex));
            return false;
        }
    }

    private static boolean isDemoAddress(String to) {
        return to.toLowerCase(Locale.ROOT).endsWith(DEMO_ADDRESS_SUFFIX);
    }

    /** The deepest cause's class. Spring's MailSendException keeps it per message, not as getCause(). */
    private static String rootCauseName(Exception ex) {
        Throwable cause = ex;
        if (ex instanceof MailSendException sendFailure && sendFailure.getMessageExceptions().length > 0) {
            cause = sendFailure.getMessageExceptions()[0];
        }
        return NestedExceptionUtils.getMostSpecificCause(cause).getClass().getSimpleName();
    }
}
