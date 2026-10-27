import type { AdminRole } from "./roles";

/** Rows of a page of the back-office lists, cards or table alike. */
export const ADMIN_PAGE_SIZE = 24;

/** A page of a back-office list, numbered from 1. */
export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const ADMIN_USER_STATUSES = ["all", "active", "suspended", "staff"] as const;
export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];

export const ADMIN_USER_SORTS = ["recent", "oldest", "username", "last-seen"] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];

/** Free fields of a profile a moderator can reset: never rewritten by hand. */
export const MODERATABLE_FIELDS = ["username", "displayName", "bio", "city", "avatar"] as const;
export type ModeratableField = (typeof MODERATABLE_FIELDS)[number];

/** Badges owed to the membership, not to sport, as stored by the backend. */
export const ADMIN_DISTINCTION_KINDS = ["founder", "team", "early_member"] as const;
export type AdminDistinctionKind = (typeof ADMIN_DISTINCTION_KINDS)[number];

export interface AdminUserSuspension {
  reason: string;
  since: string;
  /** Null for an indefinite suspension. */
  until: string | null;
}

/** `GET /api/admin/users`: a user as listed. */
export interface AdminUserSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  roles: AdminRole[];
  createdAt: string;
  /** Latest request of any session, null without one. */
  lastSeenAt: string | null;
  suspension: AdminUserSuspension | null;
  stravaConnected: boolean;
}

/** `GET /api/admin/users/:id`: everything the back office shows of a user. */
export interface AdminUserDetail extends AdminUserSummary {
  bio: string | null;
  city: string | null;
  countryCode: string | null;
  profilePrivate: boolean;
  signInMethods: ("password" | "google")[];
  strava: { accountName: string | null; connectedAt: string; lastSyncedAt: string | null } | null;
  activitiesCount: number;
  followersCount: number;
  followingCount: number;
  sessionsCount: number;
  distinctions: { kind: AdminDistinctionKind; awardedAt: string }[];
}

/** `PUT /api/admin/users/:id/suspension`. */
export interface SuspendUserRequest {
  reason: string;
  /** End of the suspension, ISO 8601; indefinite when left out. */
  until?: string;
}

/** `POST /api/admin/users/:id/moderation`. */
export interface ModerateUserRequest {
  fields: ModeratableField[];
  reason: string;
}
