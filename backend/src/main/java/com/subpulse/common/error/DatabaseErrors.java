package com.subpulse.common.error;

import java.sql.SQLException;

/** Helpers for reading MySQL errors that reach us wrapped in Spring exceptions. */
public final class DatabaseErrors {

    /** MySQL ER_DUP_ENTRY: a UNIQUE index refused the row. */
    private static final int DUPLICATE_ENTRY = 1062;

    private DatabaseErrors() {
    }

    public static boolean isDuplicateKey(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && sql.getErrorCode() == DUPLICATE_ENTRY) {
                return true;
            }
        }
        return false;
    }
}
