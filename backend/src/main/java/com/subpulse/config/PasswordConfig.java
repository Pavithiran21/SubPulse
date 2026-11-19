package com.subpulse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Kept apart from SecurityConfig because the dev seed (no web server) needs it too. */
@Configuration
public class PasswordConfig {

    /** BCrypt with 12 rounds, the same cost as WeatherPing. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
