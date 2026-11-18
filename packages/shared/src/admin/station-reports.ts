import type { StationReportDismissal, StationReportReason, StationReportStatus } from "../stations/report";
import type { AuditUser } from "./audit";

/** `GET /api/admin/station-reports/table`: a report of the railway data, for its table and its detail. */
export interface AdminStationReport {
  id: string;
  status: StationReportStatus;
  reason: StationReportReason;
  /** Told by the reporter: the custom reason, or precisions. */
  details: string | null;
  /** The station reported, as text (the id of its row on the stations page); null for a general report or once the station is gone. */
  stationId: string | null;
  /** Its name when reported, kept once it is renamed or gone; null for a general report. */
  stationName: string | null;
  /** Null once the account is deleted. */
  reporter: AuditUser | null;
  createdAt: string;
  /** The member who accepted or dismissed it, null while open. */
  resolver: AuditUser | null;
  dismissal: StationReportDismissal | null;
  /** Told to the author with the decision. */
  resolutionNote: string | null;
  resolvedAt: string | null;
  /** The member who told the author the change is live, null until `done`. */
  completer: AuditUser | null;
  completionNote: string | null;
  completedAt: string | null;
}

/** `GET /api/admin/station-reports/overview`. */
export interface AdminStationReportsOverview {
  open: number;
  /** Open reports filed in the last 24 hours. */
  openToday: number;
}

/** `GET /api/admin/station-reports/:id/related`: the other reports on the same station, the latest first. */
export interface AdminRelatedStationReports {
  reports: AdminStationReport[];
  total: number;
}

/** `POST /api/admin/station-reports/:id/acceptance` and `…/completion`: the note is optional. */
export interface DecideStationReportRequest {
  note?: string | null;
}

/** `POST /api/admin/station-reports/:id/dismissal`: the note is required for a custom dismissal. */
export interface DismissStationReportRequest extends DecideStationReportRequest {
  dismissal: StationReportDismissal;
}
