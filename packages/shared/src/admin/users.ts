import type { AdminUserTagLook } from "./user-tags";
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

/** Free fields of a profile a moderator can reset: never rewritten by hand. */
export const MODERATABLE_FIELDS = ["username", "displayName", "bio", "city", "avatar"] as const;
export type ModeratableField = (typeof MODERATABLE_FIELDS)[number];

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
  signInMethods: ("password" | "google")[];
  /** In the order of the catalog. */
  userTags: (AdminUserTagLook & { awardedAt: string })[];
  activitiesCount: number;
}

/** `GET /api/admin/users/overview`: figures above the list of the accounts. */
export interface AdminUsersOverview {
  total: number;
  /** Sign-ups of the last 7 days. */
  signups: number;
  /** Accounts seen in the last 7 days. */
  active: number;
  suspended: number;
  stravaConnected: number;
}

/** `GET /api/admin/users/:id`: everything the back office shows of a user. */
export interface AdminUserDetail extends AdminUserSummary {
  bio: string | null;
  city: string | null;
  countryCode: string | null;
  profilePrivate: boolean;
  strava: { accountName: string | null; connectedAt: string; lastSyncedAt: string | null } | null;
  followersCount: number;
  followingCount: number;
  sessionsCount: number;
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
