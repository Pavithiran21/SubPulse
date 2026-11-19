package com.subpulse.user;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * The currencies a user can pick. Each has 2 decimal places (so DECIMAL(12,2) fits every one)
 * and a locale that formats amounts the way its users expect, for example ₹1,00,000.00 for INR.
 */
public enum SupportedCurrency {
    INR("en-IN"),
    USD("en-US"),
    EUR("en-IE"),
    GBP("en-GB"),
    AUD("en-AU"),
    CAD("en-CA"),
    SGD("en-SG"),
    AED("en-AE");

    private final Locale locale;

    SupportedCurrency(String languageTag) {
        this.locale = Locale.forLanguageTag(languageTag);
    }

    /** For emails, for example "₹649.00". */
    public String format(BigDecimal amount) {
        NumberFormat format = NumberFormat.getCurrencyInstance(locale);
        format.setCurrency(java.util.Currency.getInstance(name()));
        return format.format(amount);
    }
}
