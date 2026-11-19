package com.subpulse.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.time.ZoneId;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/** An IANA time zone such as "Asia/Kolkata". Null is allowed, so optional fields can use it too. */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidTimeZone.Validator.class)
public @interface ValidTimeZone {

    String message() default "Pick a time zone from the list, like Asia/Kolkata.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<ValidTimeZone, String> {

        @Override
        public boolean isValid(String zone, ConstraintValidatorContext context) {
            return zone == null || ZoneId.getAvailableZoneIds().contains(zone);
        }
    }
}
