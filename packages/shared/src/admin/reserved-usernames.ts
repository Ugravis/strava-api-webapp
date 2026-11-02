import type { FieldRules } from "../rules";
import { USERNAME_CHARACTERS_PATTERN, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "../users/username";
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
  note?: string | null;
}

/** `PATCH /api/admin/reserved-usernames/:username`: `username` renames it, refused when an account holds the new one. */
export interface UpdateReservedUsernameRequest {
  username?: string;
  category: ReservedUsernameCategory;
  note: string | null;
}

/** The rules of a reserved username, followed by the back office as typed and by the API. */
export const RESERVED_USERNAME_RULES: FieldRules<ReserveUsernameRequest> = {
  username: {
    type: "text",
    required: true,
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
    pattern: USERNAME_CHARACTERS_PATTERN,
    patternMessage: "Minuscules, chiffres et _ uniquement.",
  },
  category: { type: "choice", required: true, values: RESERVED_USERNAME_CATEGORIES },
  note: { type: "text", maxLength: RESERVED_USERNAME_NOTE_MAX_LENGTH },
};
