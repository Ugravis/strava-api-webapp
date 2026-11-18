/** `GET /api/admin/navigation/counts`: the figures shown next to the sidebar entries. */
export interface AdminNavigationCounts {
  users: number;
  badges: number;
  userTags: number;
  reservedUsernames: number;
  stations: number;
  regions: number;
  /** Reports of profiles waiting for a decision, in a red pill. */
  openReports: number;
  /** Reports of the railway data waiting for a decision, in a red pill. */
  openStationReports: number;
}
