/** Bounds of the reason required by the destructive back-office actions. */
export const ADMIN_REASON_MIN_LENGTH = 3;
export const ADMIN_REASON_MAX_LENGTH = 500;

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
  reason: string | null;
  /** Parameters of the action, e.g. the fields reset or the end of a suspension. */
  details: Record<string, unknown> | null;
  succeeded: boolean;
  status: number | null;
  createdAt: string;
  /** Sent to the super-admins only. */
  hiddenAt?: string | null;
}
