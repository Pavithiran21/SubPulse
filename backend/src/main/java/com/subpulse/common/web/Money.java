package com.subpulse.common.web;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Money leaves the API as a string with exactly 2 decimals ("349.00"), so the browser never turns
 * it into a floating-point number. Amounts are BigDecimal everywhere in between.
 */
public final class Money {

    private Money() {
    }

    public static String format(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
