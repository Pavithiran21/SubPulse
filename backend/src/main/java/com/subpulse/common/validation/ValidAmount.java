package com.subpulse.common.validation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.math.BigDecimal;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

/**
 * A subscription amount: more than 0, at most 2 decimal places and below 100,000,000. One
 * constraint instead of @DecimalMin, @Digits and @DecimalMax, because several annotations on one
 * field can all fail at once, in no fixed order: 100000000.00 got "Use at most 2 decimal places."
 * from @Digits. Checked in the same order as the drawer (subscriptionSchema.js), so the API and
 * the form always give the same single message. Null is allowed; @NotNull reports it.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidAmount.Validator.class)
public @interface ValidAmount {

    String message() default "Enter an amount greater than 0.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<ValidAmount, BigDecimal> {

        private static final BigDecimal LIMIT = new BigDecimal("100000000");

        @Override
        public boolean isValid(BigDecimal amount, ConstraintValidatorContext context) {
            if (amount == null) {
                return true;
            }
            if (amount.stripTrailingZeros().scale() > 2) {
                return fail(context, "Use at most 2 decimal places.");
            }
            if (amount.signum() <= 0) {
                return false; // the default message: "Enter an amount greater than 0."
            }
            if (amount.compareTo(LIMIT) >= 0) {
                return fail(context, "Enter an amount below 100,000,000.");
            }
            return true;
        }

        private static boolean fail(ConstraintValidatorContext context, String message) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
            return false;
        }
    }
}
