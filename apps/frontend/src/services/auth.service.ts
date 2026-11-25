import type { VerificationChallenge } from "@kilotrace/shared";
import { apiRequest } from "@/lib/api/client";
import type { PendingGoogleSignup, SuspensionNotice, User, UsernameAvailability } from "@kilotrace/ui/lib/api/types";

export interface LoginInput {
  /** Email or username. */
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  acceptTerms: boolean;
}

export interface GoogleSignupInput {
  username: string;
  acceptTerms: boolean;
}

export const GOOGLE_SIGN_IN_URL = "/api/auth/google";

export const authService = {
  login: (input: LoginInput) =>
    apiRequest<User>("/auth/login", { method: "POST", body: { json: input } }),

  /** Sends the code that creates the account once entered. */
  register: (input: RegisterInput) =>
    apiRequest<VerificationChallenge>("/auth/register", { method: "POST", body: { json: input } }),

  verifySignup: (challengeId: string, code: string) =>
    apiRequest<User>("/auth/register/verify", {
      method: "POST",
      body: { json: { challengeId, code } },
    }),

  /** Another code for a sign-up or a password reset in progress. */
  resendCode: (challengeId: string) =>
    apiRequest<VerificationChallenge>("/auth/verification/resend", {
      method: "POST",
      body: { json: { challengeId } },
    }),

  logout: () => apiRequest("/auth/logout", { method: "POST" }),

  /** Why the latest sign-in was refused to a suspended account, for a few minutes. */
  getSuspension: () => apiRequest<SuspensionNotice>("/auth/suspension"),

  checkUsername: (username: string) =>
    apiRequest<UsernameAvailability>(
      `/users/username-availability?username=${encodeURIComponent(username)}`,
    ),

  requestPasswordReset: (email: string) =>
    apiRequest<VerificationChallenge>("/auth/password/forgot", {
      method: "POST",
      body: { json: { email } },
    }),

  /** Trades the code received for the token that sets the new password. */
  verifyPasswordReset: (challengeId: string, code: string) =>
    apiRequest<{ token: string }>("/auth/password/verify", {
      method: "POST",
      body: { json: { challengeId, code } },
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest("/auth/password/reset", {
      method: "POST",
      body: { json: { token, password } },
    }),

  getPendingGoogleSignup: () => apiRequest<PendingGoogleSignup>("/auth/google/signup"),

  completeGoogleSignup: (input: GoogleSignupInput) =>
    apiRequest<User>("/auth/google/signup", { method: "POST", body: { json: input } }),
};
