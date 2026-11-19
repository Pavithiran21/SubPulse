package com.subpulse.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Opaque tokens (refresh and password reset): 32 random bytes as base64url text (43 characters).
 * Only their SHA-256 is stored, so a copy of the database can't be used to log in.
 */
public final class TokenHashing {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TokenHashing() {
    }

    public static String newOpaqueToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256Hex(String value) {
        return HexFormat.of().formatHex(sha256(value));
    }

    public static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is missing from this JVM", ex);
        }
    }

    /** Compares two secrets in constant time: hashing first makes the lengths equal. */
    public static boolean secretsMatch(String provided, String expected) {
        if (provided == null || expected == null) {
            return false;
        }
        return MessageDigest.isEqual(sha256(provided), sha256(expected));
    }
}
