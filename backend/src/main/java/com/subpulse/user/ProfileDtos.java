package com.subpulse.user;

import java.util.Set;

import com.subpulse.common.validation.StrongPassword;
import com.subpulse.common.validation.ValidReminderDays;
import com.subpulse.common.validation.ValidTimeZone;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request bodies of /api/me. Every field of the update is optional; at least one is required. */
public final class ProfileDtos {

    private ProfileDtos() {
    }

    public record UpdateProfileRequest(
            @Size(min = 1, max = 80, message = "Use 1 to 80 characters.") String name,
            @ValidTimeZone String timeZone,
            SupportedCurrency currency,
            Boolean remindersEnabled,
            @ValidReminderDays Set<Integer> defaultReminderDays) {

        boolean isEmpty() {
            return name == null && timeZone == null && currency == null && remindersEnabled == null
                    && defaultReminderDays == null;
        }
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Enter your current password.") @Size(max = 200, message = "That password isn't right.") String currentPassword,
            @NotNull(message = "Use at least 8 characters, with a number.") @StrongPassword String newPassword) {
    }

    public record DeleteAccountRequest(
            @NotBlank(message = "Enter your password.") @Size(max = 200, message = "That password isn't right.") String password) {
    }

    public record PasswordChangedResponse(String accessToken) {
    }
}
