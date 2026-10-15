export interface User {
  id: string;
  email: string;
  username: string;
  /** Optional: use `publicNameOf` to display a user. */
  displayName: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export interface PendingGoogleSignup {
  email: string;
  suggestedUsername: string;
}

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: "invalid" | "reserved" | "taken" };
