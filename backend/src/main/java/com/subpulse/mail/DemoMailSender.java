package com.subpulse.mail;

import org.springframework.mail.javamail.JavaMailSender;

/**
 * The SMTP sender for demo accounts' emails (the Ethereal inbox in DEMO_SMTP_*), or none when
 * DEMO_SMTP_* is not set. A holder rather than a second JavaMailSender bean on purpose: Spring
 * Boot builds the main sender from spring.mail.* only while no JavaMailSender bean exists.
 */
public record DemoMailSender(JavaMailSender sender) {

    public boolean isConfigured() {
        return sender != null;
    }
}
