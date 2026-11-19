package com.subpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

// UserDetailsServiceAutoConfiguration is excluded because logins use our own JWT filter; without
// the exclusion Spring Boot would create an in-memory user and log a generated password.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
@EnableScheduling
@EnableAsync
public class SubPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(SubPulseApplication.class, args);
    }
}
