"use server";

import type { StationReportDismissal } from "@kilotrace/shared";
import type { AdminRelatedStationReports, AdminStationReport, DecideStationReportRequest, DismissStationReportRequest } from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { getAdminMe } from "@/lib/admin/access";
import { checkedId, runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
import { fetchAdminTable } from "@/lib/admin/table";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REFUSALS = { REPORT_CLOSED: "Ce signalement a déjà été traité." };

/** A page of the table of the reports of the railway data. */
export async function fetchStationReportsTable(query: TableQuery): Promise<TablePage<AdminStationReport>> {
  return fetchAdminTable<AdminStationReport>("/station-reports/table", query);
}

/** A report, null when it does not exist: `?row=` may name a station. */
export async function loadStationReport(id: string): Promise<AdminStationReport | null> {
  if (!UUID.test(id)) return null;
  const result = await adminApi<AdminStationReport>(`/station-reports/${id}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Station report ${result.status}`);
}

/** A report and whether the current member may decide on it. */
export interface StationReportDetailData {
  report: AdminStationReport;
  canHandle: boolean;
}

export async function loadStationReportDetail(id: string): Promise<StationReportDetailData | null> {
  const [report, me] = await Promise.all([loadStationReport(id), getAdminMe()]);
  if (!report) return null;
  if (!me) throw new Error("No member");
  return { report, canHandle: me.permissions.includes("stations.reports") };
}

/** The other reports on the same station, from `offset`. */
export async function loadRelatedStationReports(id: string, offset: number): Promise<AdminRelatedStationReports> {
  const result = await adminApi<AdminRelatedStationReports>(`/station-reports/${checkedId(id)}/related?offset=${offset}`);
  if (!result.ok) throw new Error(`Related station reports ${result.status}`);
  return result.data;
}

/*
 * Decisions on a report, each told to its author with the note. The backend
 * checks the permission and the step of the report, and records every call.
 */

export async function acceptStationReport(id: string, note: string | undefined): Promise<ActionResult> {
  const body: DecideStationReportRequest = { note: note || null };
  return runAdminAction(`/station-reports/${checkedId(id)}/acceptance`, "POST", body, REFUSALS);
}

export async function dismissStationReport(id: string, dismissal: StationReportDismissal, note: string | undefined): Promise<ActionResult> {
  const body: DismissStationReportRequest = { dismissal, note: note || null };
  return runAdminAction(`/station-reports/${checkedId(id)}/dismissal`, "POST", body, REFUSALS);
}

/** The change asked is live: the author is told. */
export async function completeStationReport(id: string, note: string | undefined): Promise<ActionResult> {
  const body: DecideStationReportRequest = { note: note || null };
  return runAdminAction(`/station-reports/${checkedId(id)}/completion`, "POST", body, REFUSALS);
}
