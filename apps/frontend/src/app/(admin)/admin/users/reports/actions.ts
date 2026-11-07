"use server";

import {
  type AdminRelatedUserReports,
  type AdminUserReport,
  MODERATABLE_FIELDS,
  type ModeratableField,
  type SanctionUserReportRequest,
  type UserReportSanction,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import { getAdminMe } from "@/lib/admin/access";
import { checkedId, reasonOf, runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
import { fetchAdminTable } from "@/lib/admin/table";
import { loadUserDetail, type UserDetailData } from "../actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REFUSALS = { REPORT_CLOSED: "Ce signalement a déjà été traité." };

/** A page of the table of the reports. */
export async function fetchReportsTable(query: TableQuery): Promise<TablePage<AdminUserReport>> {
  return fetchAdminTable<AdminUserReport>("/user-reports/table", query);
}

/** A report, null when it does not exist: `?row=` may name an account. */
export async function loadReport(id: string): Promise<AdminUserReport | null> {
  if (!UUID.test(id)) return null;
  const result = await adminApi<AdminUserReport>(`/user-reports/${id}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Report ${result.status}`);
}

/** Everything the detail of a report shows, and what the current member may do on it. */
export interface ReportDetailData {
  report: AdminUserReport;
  /** The reported account, null once deleted. */
  target: UserDetailData | null;
  canHandle: boolean;
}

export async function loadReportDetail(id: string): Promise<ReportDetailData | null> {
  const report = await loadReport(id);
  if (!report) return null;
  const [me, target] = await Promise.all([getAdminMe(), report.target ? loadUserDetail(report.target.id) : null]);
  if (!me) throw new Error("No member");
  return { report, target, canHandle: me.permissions.includes("reports.handle") };
}

/** The other reports on the same target, from `offset`. */
export async function loadRelatedReports(id: string, offset: number): Promise<AdminRelatedUserReports> {
  const result = await adminApi<AdminRelatedUserReports>(`/user-reports/${checkedId(id)}/related?offset=${offset}`);
  if (!result.ok) throw new Error(`Related reports ${result.status}`);
  return result.data;
}

/*
 * Decisions on a report. The backend checks the permissions, the target and
 * the reason, and records every call.
 */

/** Bound by the page to a report and a sanction: the form is the one of the action on the account. */
export async function sanctionReport(id: string, sanction: UserReportSanction, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const until = formData.get("until");
  const fields = formData.getAll("fields").filter((field): field is ModeratableField => MODERATABLE_FIELDS.includes(field as ModeratableField));
  const body: SanctionUserReportRequest = {
    sanction,
    reason: reasonOf(formData) ?? "",
    ...(sanction === "moderation" && { fields }),
    ...(sanction === "suspension" && typeof until === "string" && until && { until }),
  };
  return runAdminAction(`/user-reports/${checkedId(id)}/sanction`, "POST", body, REFUSALS);
}

/** Closes a report as sanctioned, the account left as it is: the sanction was taken apart. */
export async function closeReportAsSanctioned(id: string, reason: string): Promise<ActionResult> {
  const body: SanctionUserReportRequest = { sanction: "other", reason };
  return runAdminAction(`/user-reports/${checkedId(id)}/sanction`, "POST", body, REFUSALS);
}

export async function dismissReport(id: string, reason: string): Promise<ActionResult> {
  return runAdminAction(`/user-reports/${checkedId(id)}/dismissal`, "POST", { reason }, REFUSALS);
}
