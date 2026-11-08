import "server-only";
import type {
  AdminCommitsResponse,
  AdminDevResponse,
  AdminExplorationResponse,
  AdminPage,
  AdminReleaseNotesOverview,
  AdminSiteActivityOverview,
  AdminSiteActivityPages,
  AdminSiteActivityUsers,
  AdminStatisticsResponse,
  AdminUserReportsOverview,
  AdminUserSummary,
  AdminUsersOverview,
  AuditLogEntry,
  AuditLogOverview,
} from "@kilotrace/shared/admin";
import type { SystemStatusResponse } from "@kilotrace/shared";
import { TABLE_DEFAULT_SORT } from "@kilotrace/shared/table";
import { cache } from "react";
import { adminApi } from "@/lib/admin/api";
import { fetchAdminTable } from "@/lib/admin/table";

/** Accounts of the list of the latest sign-ups, as many as the entries of a page of the audit log. */
export const DASHBOARD_LIST_SIZE = 24;

/** Days of the charts of the site activity, those of the statistics. */
export const DASHBOARD_ACTIVITY_DAYS = 30;

/** The data of a call, null when it failed: each section degrades on its own. */
const load = <T>(path: string) =>
  cache(async (): Promise<T | null> => {
    const result = await adminApi<T>(path).catch(() => null);
    return result?.ok ? result.data : null;
  });

/** Calls shared by several sections, made once per request. */
export const dashboardData = {
  statistics: load<AdminStatisticsResponse>("/statistics"),
  users: load<AdminUsersOverview>("/users/overview"),
  reports: load<AdminUserReportsOverview>("/user-reports/overview"),
  week: load<AdminSiteActivityOverview>("/site-activity/overview?days=7&team=false"),
  /** The site activity, the team counted or not. */
  activeUsers: cache((team: boolean) => load<AdminSiteActivityUsers>(`/site-activity/users?days=${DASHBOARD_ACTIVITY_DAYS}&team=${team}`)()),
  pageViews: cache((team: boolean) => load<AdminSiteActivityPages>(`/site-activity/pages?days=${DASHBOARD_ACTIVITY_DAYS}&team=${team}`)()),
  exploration: load<AdminExplorationResponse>("/statistics/exploration"),
  system: load<SystemStatusResponse>("/system"),
  dev: load<AdminDevResponse>("/dev"),
  commits: load<AdminCommitsResponse>("/dev/commits"),
  releaseNotes: load<AdminReleaseNotesOverview>("/release-notes/overview"),
  audit: load<AuditLogOverview>("/audit-log/overview"),
  auditEntries: load<AdminPage<AuditLogEntry>>("/audit-log"),
  /** Entries of a member, for their own count. */
  auditOf: cache(async (actor: string): Promise<AdminPage<AuditLogEntry> | null> => {
    const result = await adminApi<AdminPage<AuditLogEntry>>(`/audit-log?actor=${actor}`).catch(() => null);
    return result?.ok ? result.data : null;
  }),
  recentUsers: cache(async (): Promise<AdminUserSummary[] | null> => {
    const page = await fetchAdminTable<AdminUserSummary>("/users/table", {
      q: "",
      filters: {},
      sort: TABLE_DEFAULT_SORT,
      groupBy: null,
      folded: [],
      page: 1,
      pageSize: DASHBOARD_LIST_SIZE,
    }).catch(() => null);
    return page?.entries.flatMap((entry) => ("row" in entry ? [entry.row] : [])) ?? null;
  }),
};
