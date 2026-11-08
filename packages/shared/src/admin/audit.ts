/** Bounds of the reason required by the destructive back-office actions. */
export const ADMIN_REASON_MIN_LENGTH = 3;
export const ADMIN_REASON_MAX_LENGTH = 500;

/** Order of the entries by date; the first one is the default. */
export const AUDIT_ORDERS = ["desc", "asc"] as const;
export type AuditOrder = (typeof AUDIT_ORDERS)[number];

export const AUDIT_OUTCOMES = ["all", "succeeded", "failed"] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];

/** Masked entries, a filter offered to the super-admins only. */
export const AUDIT_VISIBILITIES = ["all", "visible", "hidden"] as const;
export type AuditVisibility = (typeof AUDIT_VISIBILITIES)[number];

/** A user named by an audit entry; null fields once the account is deleted. */
export interface AuditUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/** Kinds of objects an entry may target besides a user. */
export const AUDIT_TARGET_TYPES = ["badge", "badge_theme", "userTag", "releaseNote", "report", "username"] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/** An object other than a user targeted by an entry, named as it is now, else as recorded. */
export interface AuditTarget {
  type: AuditTargetType;
  id: string;
  /** Its name, else its id. */
  name: string;
  /** `#rrggbb` of its look, when it has one. */
  color: string | null;
  /** The object no longer exists. */
  deleted: boolean;
}

/** `GET /api/admin/audit-log`: an entry of the audit log. */
export interface AuditLogEntry {
  id: string;
  /** Null for an action run outside a request (startup bootstrap). */
  actor: AuditUser | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  /** The target user, when the target is one. */
  targetUser: AuditUser | null;
  /** The target object, when it is not a user; also the object an entry creates. */
  target: AuditTarget | null;
  reason: string | null;
  /** Parameters of the action, e.g. the fields reset or the end of a suspension. */
  details: Record<string, unknown> | null;
  succeeded: boolean;
  status: number | null;
  createdAt: string;
  /** Sent to the super-admins only. */
  hiddenAt?: string | null;
}

/** `GET /api/admin/audit-log/overview`: figures above the log, masked entries left out. */
export interface AuditLogOverview {
  total: number;
  /** Entries of the last 24 hours. */
  today: number;
  /** Failed actions of the last 7 days. */
  failures: number;
  /** Entries of the last 7 days, to which the failures compare. */
  week: number;
  /** Members who acted in the last 7 days. */
  actors: number;
  /** Each of the last 30 UTC days, oldest first. */
  entriesByDay: number[];
  actorsByDay: number[];
}
