import type { UserReportReason } from "../users/report";
import type { AuditUser } from "./audit";
import type { ModeratableField } from "./users";

/** Open until the team decides: a sanction or a dismissal, each final. */
export const USER_REPORT_STATUSES = ["open", "sanctioned", "dismissed"] as const;
export type UserReportStatus = (typeof USER_REPORT_STATUSES)[number];

/** What a sanction did to the target; `other` only closes the report, the account left as it is. */
export const USER_REPORT_SANCTIONS = ["moderation", "suspension", "deletion", "other"] as const;
export type UserReportSanction = (typeof USER_REPORT_SANCTIONS)[number];

/** `GET /api/admin/user-reports/table`: a report, for its table and its detail. */
export interface AdminUserReport {
  id: string;
  status: UserReportStatus;
  reason: UserReportReason;
  /** Told by the reporter: the custom reason, or precisions. */
  details: string | null;
  /** Null once the account is deleted. */
  target: AuditUser | null;
  /** Username of the target when reported, kept once it is reset or deleted. */
  targetUsername: string;
  /** Null once the account is deleted. */
  reporter: AuditUser | null;
  createdAt: string;
  sanction: UserReportSanction | null;
  /** The member who decided, null while open or once the account is deleted. */
  resolver: AuditUser | null;
  /** Why the team decided, never shown to the users. */
  resolutionNote: string | null;
  resolvedAt: string | null;
}

/** `GET /api/admin/user-reports/overview`. */
export interface AdminUserReportsOverview {
  open: number;
  /** Open reports filed in the last 24 hours. */
  openToday: number;
}

/** `GET /api/admin/user-reports/:id/related`: the other reports on the same target, the latest first. */
export interface AdminRelatedUserReports {
  reports: AdminUserReport[];
  total: number;
}

/** `POST /api/admin/user-reports/:id/sanction`: closes every open report on the target. */
export interface SanctionUserReportRequest {
  sanction: UserReportSanction;
  reason: string;
  /** The fields reset by a `moderation`. */
  fields?: ModeratableField[];
  /** The end of a `suspension`, none for an indefinite one. */
  until?: string;
}

/** `POST /api/admin/user-reports/:id/dismissal`: closes this report only. */
export interface DismissUserReportRequest {
  reason: string;
}
