package com.subpulse.subscription;

import java.math.BigDecimal;

public enum BillingCycle {
    WEEKLY("Weekly", 52),
    MONTHLY("Monthly", 12),
    QUARTERLY("Quarterly", 4),
    YEARLY("Yearly", 1);

    private final String label;
    private final int paymentsPerYear;

    BillingCycle(String label, int paymentsPerYear) {
        this.label = label;
        this.paymentsPerYear = paymentsPerYear;
    }

    public String label() {
        return label;
    }

    /** What one payment of this size costs over a year; exact, because it only multiplies. */
    public BigDecimal yearlyCost(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(paymentsPerYear));
    }
}
