"use server";

import type { AuditLogEntry } from "@kilotrace/shared/admin";
import { mapTablePage, type TablePage, type TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import { checkedId, runAdminAction } from "@/lib/admin/actions";
import { fetchAdminTable } from "@/lib/admin/table";
import type { AuditRow } from "./audit-row";
import { withTexts } from "./entry-text";

/** Entries of one author or one target, besides the picks of the table. */
export interface AuditScope {
  actor?: string;
  target?: string;
}

/** A page of the logs, the entries with their texts. */
export async function fetchAuditTable(query: TableQuery, scope: AuditScope): Promise<TablePage<AuditRow>> {
  return mapTablePage(await fetchAdminTable<AuditLogEntry>("/audit-log/table", query, { ...scope }), withTexts);
}

/** Masks an entry from everyone but the super-admins, or shows it again; recorded too. */
export async function setEntryHidden(id: string, hidden: boolean): Promise<ActionResult> {
  return runAdminAction(`/audit-log/${checkedId(id)}/hidden`, hidden ? "PUT" : "DELETE");
}
