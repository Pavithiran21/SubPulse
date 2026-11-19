package com.subpulse.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.util.Set;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/**
 * Reminder chips: at least one of 7, 5, 3, 1 days before, or 0 ("Same day"). Null is allowed so
 * optional fields can use it; required fields add @NotNull.
 */
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidReminderDays.Validator.class)
public @interface ValidReminderDays {

    Set<Integer> ALLOWED = Set.of(0, 1, 3, 5, 7);

    String message() default "Pick at least one reminder, or turn reminders off in Settings.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<ValidReminderDays, Set<Integer>> {

        @Override
        public boolean isValid(Set<Integer> days, ConstraintValidatorContext context) {
            if (days == null) {
                return true;
            }
            if (days.isEmpty()) {
                return false;
            }
            if (!ALLOWED.containsAll(days)) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("Use 0, 1, 3, 5 or 7 days before.").addConstraintViolation();
                return false;
            }
            return true;
        }
    }
}
