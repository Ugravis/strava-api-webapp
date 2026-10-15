/**
 * Subset of the Strava API v3 payloads used by the application.
 * The Strava API Policy forbids keeping location data beyond a short cache:
 * `map` is only relayed to the athlete's browser, never persisted, and the
 * other location fields (`start_latlng`...) are not declared.
 */

export interface StravaAthleteSummary {
  id: number;
  firstname?: string | null;
  lastname?: string | null;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Epoch seconds. */
  expires_at: number;
  athlete?: StravaAthleteSummary;
}

export interface StravaActivity {
  id: number;
  name: string;
  /** e.g. `Run`, `TrailRun`, `GravelRide`. */
  sport_type: string;
  /** ISO 8601, UTC. */
  start_date: string;
  /** e.g. `(GMT+01:00) Europe/Paris`. */
  timezone?: string | null;
  /** Meters. */
  distance: number;
  /** Seconds. */
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain?: number | null;
  trainer?: boolean;
  manual?: boolean;
  map?: StravaActivityMap | null;
}

export interface StravaActivityMap {
  /** Low-resolution track, Google encoded polyline; empty without GPS. */
  summary_polyline?: string | null;
}

export interface StravaWebhookSubscription {
  id: number;
  callback_url: string;
}

export interface ListActivitiesParams {
  page: number;
  perPage: number;
  /** Only activities started after this date. */
  after?: Date;
}
