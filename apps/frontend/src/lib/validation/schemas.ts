import {
  BIO_MAX_LENGTH,
  CITY_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PROFILE_COLOR_PATTERN,
  USERNAME_CHARACTERS_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isCommonPassword,
  passwordContext,
  passwordLength,
} from "@kilotrace/shared";
import { z } from "zod";

/**
 * Validation rules of the API, from the shared package. Error messages are
 * keys of the `validation` translation namespace.
 */

export const emailSchema = z
  .string()
  .trim()
  .max(EMAIL_MAX_LENGTH, "emailInvalid")
  .pipe(z.email({ error: "emailInvalid" }));

/** Email or username, to sign in. */
export const identifierSchema = z.string().trim().min(1, "required").max(EMAIL_MAX_LENGTH, "identifierInvalid");

/** A password typed to sign in or confirm: only its upper bound, so an old one still works. */
export const currentPasswordSchema = z.string().min(1, "required").max(PASSWORD_MAX_LENGTH, "passwordMax");

/** NIST SP 800-63B: a length in characters and a blocklist, no composition rule. */
export const passwordSchema = z
  .string()
  .refine((password) => passwordLength(password) >= PASSWORD_MIN_LENGTH, "passwordMin")
  .refine((password) => passwordLength(password) <= PASSWORD_MAX_LENGTH, "passwordMax")
  .refine((password) => !isCommonPassword(password), "passwordCommon");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, "usernameLength")
  .max(USERNAME_MAX_LENGTH, "usernameLength")
  .regex(USERNAME_CHARACTERS_PATTERN, "usernamePattern");

/** Optional: an empty value clears the display name, the username is then shown. */
export const displayNameSchema = z.string().trim().max(DISPLAY_NAME_MAX_LENGTH, "displayNameMax");

export const acceptTermsSchema = z.boolean().refine((accepted) => accepted, "termsRequired");

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: currentPasswordSchema,
  rememberMe: z.boolean(),
});

/** The display name is not asked at sign-up: it can be set later from the profile. */
export const registerSchema = z
  .object({
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema,
    acceptTerms: acceptTermsSchema,
  })
  // Also refused: a password built on the username or the email.
  .refine(({ email, username, password }) => !isCommonPassword(password, passwordContext(email, username)), {
    path: ["password"],
    message: "passwordCommon",
  });

export const googleSignupSchema = z.object({
  username: usernameSchema,
  acceptTerms: acceptTermsSchema,
});

export const profileSchema = z
  .object({
  displayName: displayNameSchema,
  username: usernameSchema,
  bio: z.string().trim().max(BIO_MAX_LENGTH, "bioMax"),
  city: z.string().trim().max(CITY_MAX_LENGTH, "cityMax"),
  /** Set once a city is picked among the suggestions. */
  countryCode: z.string().length(2).nullable(),
  favoriteSports: z.array(z.enum(["run", "hike", "ride", "swim"])),
  profileColor: z
    .string()
    .regex(PROFILE_COLOR_PATTERN)
    .nullable(),
  })
  // A city typed but not picked may not exist.
  .refine(({ city, countryCode }) => city === "" || countryCode !== null, { path: ["city"], message: "cityPick" });

export const forgotPasswordSchema = z.object({ email: emailSchema });

/** New password with confirmation, optionally preceded by the current one. */
export function newPasswordSchema(requireCurrentPassword: boolean) {
  return z
    .object({
      currentPassword: requireCurrentPassword ? currentPasswordSchema : z.string().optional(),
      newPassword: passwordSchema,
      confirmPassword: z.string(),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ["confirmPassword"],
      message: "passwordMismatch",
    });
}

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type GoogleSignupValues = z.infer<typeof googleSignupSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type NewPasswordValues = z.infer<ReturnType<typeof newPasswordSchema>>;
