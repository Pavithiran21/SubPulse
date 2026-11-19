package com.subpulse.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.nio.charset.StandardCharsets;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/**
 * A new password: at least 8 characters with a number, and at most 72 bytes in UTF-8, because
 * BCrypt ignores everything after byte 72.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = StrongPassword.Validator.class)
public @interface StrongPassword {

    String message() default "Use at least 8 characters, with a number.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<StrongPassword, String> {

        private static final int MIN_LENGTH = 8;
        private static final int MAX_BYTES = 72;

        @Override
        public boolean isValid(String password, ConstraintValidatorContext context) {
            if (password == null || password.length() < MIN_LENGTH || !password.matches(".*\\d.*")) {
                return false;
            }
            if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("Use at most 72 characters.").addConstraintViolation();
                return false;
            }
            return true;
        }
    }
}
