package com.subpulse.user;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.subpulse.auth.AuthCookies;
import com.subpulse.auth.AuthSession;
import com.subpulse.auth.AuthUser;
import com.subpulse.user.ProfileDtos.ChangePasswordRequest;
import com.subpulse.user.ProfileDtos.DeleteAccountRequest;
import com.subpulse.user.ProfileDtos.PasswordChangedResponse;
import com.subpulse.user.ProfileDtos.UpdateProfileRequest;

import jakarta.validation.Valid;

/** The logged-in user's own account. There is no endpoint that takes another user's id. */
@RestController
@RequestMapping("/api/me")
public class ProfileController {

    private final ProfileService profileService;
    private final AuthCookies cookies;

    public ProfileController(ProfileService profileService, AuthCookies cookies) {
        this.profileService = profileService;
        this.cookies = cookies;
    }

    @GetMapping
    public UserResponse get(@AuthenticationPrincipal AuthUser user) {
        return profileService.get(user.id());
    }

    @PatchMapping
    public UserResponse update(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody UpdateProfileRequest body) {
        return profileService.update(user.id(), body);
    }

    @PostMapping("/password")
    public ResponseEntity<PasswordChangedResponse> changePassword(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody ChangePasswordRequest body) {
        AuthSession session = profileService.changePassword(user.id(), body.currentPassword(), body.newPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.create(session.refreshToken()))
                .body(new PasswordChangedResponse(session.accessToken()));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(@AuthenticationPrincipal AuthUser user,
            @Valid @RequestBody DeleteAccountRequest body) {
        profileService.deleteAccount(user.id(), body.password());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear()).build();
    }
}
