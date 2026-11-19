import { z } from 'zod';
import { findTimeZone } from '../../lib/timeZones';

// The same rules as the backend's request checks, with the messages from
// UI-UX.md "Validation messages". The server checks everything again.

export const emailField = z.string().trim().pipe(z.email('Enter a valid email, like name@example.com.'));

export const newPasswordField = z
  .string()
  .refine((value) => value.length >= 8 && /\d/.test(value), 'Use at least 8 characters, with a number.')
  // BCrypt only uses 72 bytes, so the backend refuses longer passwords.
  .refine((value) => new TextEncoder().encode(value).length <= 72, 'Use at most 72 characters.');

export const passwordField = z.string().min(1, 'Enter your password.');

export const timeZoneField = z.string().refine((value) => findTimeZone(value) !== null, 'Pick a time zone from the list, like Asia/Kolkata.');

export const currencyField = z.string().min(1, 'Pick a currency.');

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use at most 80 characters.'),
  email: emailField,
  password: newPasswordField,
  timeZone: timeZoneField,
  currency: currencyField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  });
