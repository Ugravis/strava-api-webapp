/** Why a user reports another one, picked in the dialog of the profile. */
export const USER_REPORT_REASONS = ["harassment", "inappropriate", "impersonation", "spam", "cheating", "other"] as const;
export type UserReportReason = (typeof USER_REPORT_REASONS)[number];

export const USER_REPORT_DETAILS_MAX_LENGTH = 500;

/** A custom reason is told in the details; they are optional otherwise. */
export const USER_REPORT_CUSTOM_REASON: UserReportReason = "other";

/** `POST /api/profiles/:username/report`. */
export interface ReportUserRequest {
  reason: UserReportReason;
  details?: string | null;
}
