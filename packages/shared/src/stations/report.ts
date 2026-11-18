/** Why a user reports the railway data from the band of the map: something missing or wrong, no station picked. */
export const STATION_REPORT_GENERAL_REASONS = ["missing_station", "railway", "wrong_count", "other"] as const;

/** Why a user reports a station from its panel. */
export const STATION_REPORT_STATION_REASONS = ["wrong_name", "wrong_location", "wrong_zone", "closed", "duplicate", "other"] as const;

export type StationReportReason = (typeof STATION_REPORT_GENERAL_REASONS)[number] | (typeof STATION_REPORT_STATION_REASONS)[number];

/** Every reason, each once. */
export const STATION_REPORT_REASONS: readonly StationReportReason[] = [...new Set([...STATION_REPORT_GENERAL_REASONS, ...STATION_REPORT_STATION_REASONS])];

/** A custom reason is told in the details; they are optional otherwise. */
export const STATION_REPORT_CUSTOM_REASON: StationReportReason = "other";

export const STATION_REPORT_DETAILS_MAX_LENGTH = 500;

/** `POST /api/stations/reports`: about a station when `stationId` is given, its reasons then. */
export interface ReportStationRequest {
  reason: StationReportReason;
  details?: string | null;
  stationId?: number | null;
}

/** Open until the team decides; accepted, it waits for the change to be live (`done`). */
export const STATION_REPORT_STATUSES = ["open", "accepted", "done", "dismissed"] as const;
export type StationReportStatus = (typeof STATION_REPORT_STATUSES)[number];

/** Why the team dismisses a report, told to its author. */
export const STATION_REPORT_DISMISSALS = ["already_fixed", "duplicate", "osm_correct", "out_of_scope", "unverifiable", "other"] as const;
export type StationReportDismissal = (typeof STATION_REPORT_DISMISSALS)[number];

/** A custom dismissal is told in the note; it is optional otherwise. */
export const STATION_REPORT_CUSTOM_DISMISSAL: StationReportDismissal = "other";

/** Longest note of the team on a decision, told to the author. */
export const STATION_REPORT_NOTE_MAX_LENGTH = 500;
