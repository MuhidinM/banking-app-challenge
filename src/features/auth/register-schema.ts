import { z } from "zod";

import type { RegisterRequest } from "@/shared/api/types";

/** The API's phone rule (docs/api/openapi.json, RegisterRequest.phoneNumber). */
const PHONE_PATTERN = /^\+?[0-9. ()-]{7,25}$/;

/**
 * The register form, checked before sending with the same rules the API
 * applies (docs/api-notes.md), so the user isn't sent a round trip to learn a
 * password is too short. Messages are written for the form.
 */
const registerFieldsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  username: z
    .string()
    .trim()
    .min(1, "Choose a username.")
    .min(3, "Username must be 3 to 50 characters.")
    .max(50, "Username must be 3 to 50 characters."),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Enter your phone number.")
    .regex(PHONE_PATTERN, "Enter a phone number like +251 911 234 567."),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Enter an email address like you@example.com.",
    }),
  // Not trimmed: spaces can be part of a password.
  password: z
    .string()
    .min(1, "Choose a password.")
    .min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(1, "Repeat your password."),
});

export type RegisterField = keyof z.input<typeof registerFieldsSchema>;
export type RegisterValues = z.output<typeof registerFieldsSchema>;
export type RegisterErrors = Partial<Record<RegisterField, string>>;

export type RegisterValidation =
  { ok: true; request: RegisterRequest } | { ok: false; errors: RegisterErrors };

/** Checks the form; on success returns the API request (email left out when empty). */
export function validateRegister(input: Record<RegisterField, string>): RegisterValidation {
  const result = registerFieldsSchema.safeParse(input);
  const errors: RegisterErrors = {};

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as RegisterField;
      errors[field] ??= issue.message;
    }
  }
  // Compared here rather than in a zod refinement so it shows alongside the
  // other errors, not only once every other field is valid.
  if (!errors.confirmPassword && input.confirmPassword !== input.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!result.success || Object.keys(errors).length > 0) return { ok: false, errors };

  const { email, password, confirmPassword: _confirm, ...rest } = result.data;
  return {
    ok: true,
    request: { ...rest, passwordHash: password, ...(email ? { email } : {}) },
  };
}
