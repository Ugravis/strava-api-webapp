import { apiRequest } from "@/lib/api/client";
import type { PendingGoogleSignup, User, UsernameAvailability } from "@/lib/api/types";

export interface LoginInput {
  email: string;
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

  register: (input: RegisterInput) =>
    apiRequest<User>("/auth/register", { method: "POST", body: { json: input } }),

  logout: () => apiRequest("/auth/logout", { method: "POST" }),

  checkUsername: (username: string) =>
    apiRequest<UsernameAvailability>(
      `/users/username-availability?username=${encodeURIComponent(username)}`,
    ),

  requestPasswordReset: (email: string) =>
    apiRequest("/auth/password/forgot", { method: "POST", body: { json: { email } } }),

  resetPassword: (token: string, password: string) =>
    apiRequest("/auth/password/reset", {
      method: "POST",
      body: { json: { token, password } },
    }),

  getPendingGoogleSignup: () => apiRequest<PendingGoogleSignup>("/auth/google/signup"),

  completeGoogleSignup: (input: GoogleSignupInput) =>
    apiRequest<User>("/auth/google/signup", { method: "POST", body: { json: input } }),
};
