export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export interface AuthProviders {
  google: boolean;
}

export interface PendingGoogleSignup {
  email: string;
  displayName: string;
  suggestedUsername: string;
}

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: "invalid" | "reserved" | "taken" };
