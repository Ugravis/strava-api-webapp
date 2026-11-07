/** `GET /api/admin/navigation/counts`: the figures shown next to the sidebar entries. */
export interface AdminNavigationCounts {
  users: number;
  badges: number;
  userTags: number;
  reservedUsernames: number;
  /** Reports waiting for a decision, in a red pill. */
  openReports: number;
}
