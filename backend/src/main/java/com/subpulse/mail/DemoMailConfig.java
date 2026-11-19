package com.subpulse.mail;

import java.util.Properties;

import org.springframework.boot.mail.autoconfigure.MailProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import com.subpulse.config.AppProperties;
import com.subpulse.config.AppProperties.DemoSmtp;

/** Builds the demo inbox's sender from DEMO_SMTP_*, with the same STARTTLS and timeouts as the main one. */
@Configuration
public class DemoMailConfig {

    @Bean
    public DemoMailSender demoMailSender(AppProperties props, MailProperties mail) {
        DemoSmtp smtp = props.demoSmtp();
        if (smtp == null || !smtp.isConfigured()) {
            return new DemoMailSender(null);
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(smtp.host());
        sender.setPort(smtp.port());
        sender.setUsername(smtp.user());
        sender.setPassword(smtp.pass());
        // spring.mail.properties in application.yml: STARTTLS, the timeouts and mail.from.
        Properties javaMail = new Properties();
        javaMail.putAll(mail.getProperties());
        sender.setJavaMailProperties(javaMail);
        return new DemoMailSender(sender);
    }
}
