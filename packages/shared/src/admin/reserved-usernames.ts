import type { AuditUser } from "./audit";

/** Why a username is kept out of the sign-ups. */
export const RESERVED_USERNAME_CATEGORIES = ["system", "personality", "brand", "offensive", "other"] as const;
export type ReservedUsernameCategory = (typeof RESERVED_USERNAME_CATEGORIES)[number];

export function isReservedUsernameCategory(value: unknown): value is ReservedUsernameCategory {
  return RESERVED_USERNAME_CATEGORIES.includes(value as ReservedUsernameCategory);
}

export const RESERVED_USERNAME_NOTE_MAX_LENGTH = 300;

/** `GET /api/admin/reserved-usernames`: a username nobody can take, alphabetical. */
export interface AdminReservedUsername {
  username: string;
  category: ReservedUsernameCategory;
  /** Private note of the team, never shown to the users. */
  note: string | null;
  /** Null for the initial list, or once the account is deleted. */
  createdBy: AuditUser | null;
  createdAt: string;
}

/** `POST /api/admin/reserved-usernames`: refused when an account holds it. */
export interface ReserveUsernameRequest {
  username: string;
  category: ReservedUsernameCategory;
  note?: string;
}
