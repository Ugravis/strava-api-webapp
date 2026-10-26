import { z } from "zod";

/**
 * Validation rules mirrored from the API. Error messages are keys of the
 * `validation` translation namespace.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

export const emailSchema = z.string().trim().pipe(z.email({ error: "emailInvalid" }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "passwordMin")
  .max(PASSWORD_MAX_LENGTH, "passwordMax");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, "usernameLength")
  .max(USERNAME_MAX_LENGTH, "usernameLength")
  .regex(USERNAME_PATTERN, "usernamePattern");

/** Optional: an empty value clears the display name, the username is then shown. */
export const displayNameSchema = z.string().trim().max(50, "displayNameMax");

export const acceptTermsSchema = z.boolean().refine((accepted) => accepted, "termsRequired");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required"),
  rememberMe: z.boolean(),
});

/** The display name is not asked at sign-up: it can be set later from the profile. */
export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  acceptTerms: acceptTermsSchema,
});

export const googleSignupSchema = z.object({
  username: usernameSchema,
  acceptTerms: acceptTermsSchema,
});

export const profileSchema = z
  .object({
  displayName: displayNameSchema,
  username: usernameSchema,
  bio: z.string().trim().max(160, "bioMax"),
  city: z.string().trim().max(60, "cityMax"),
  /** Set once a city is picked among the suggestions. */
  countryCode: z.string().length(2).nullable(),
  favoriteSports: z.array(z.enum(["run", "hike", "ride", "swim"])),
  profileColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
  })
  // A city typed but not picked may not exist.
  .refine(({ city, countryCode }) => city === "" || countryCode !== null, { path: ["city"], message: "cityPick" });

export const forgotPasswordSchema = z.object({ email: emailSchema });

/** New password with confirmation, optionally preceded by the current one. */
export function newPasswordSchema(requireCurrentPassword: boolean) {
  return z
    .object({
      currentPassword: requireCurrentPassword
        ? z.string().min(1, "required")
        : z.string().optional(),
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
