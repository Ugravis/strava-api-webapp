"use server";

import type { AuditLogEntry } from "@kilotrace/shared/admin";
import { mapTablePage, type TablePage, type TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { checkedId, runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An entry with its texts, null when it is not one (e.g. the id of a user opened beside) or masked from this role. */
export async function loadAuditEntry(id: string): Promise<AuditRow | null> {
  if (!UUID.test(id)) return null;
  const result = await adminApi<AuditLogEntry>(`/audit-log/${id}`);
  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error(`Audit entry ${result.status}`);
  }
  return withTexts([result.data])[0];
}

/** Masks an entry from everyone but the super-admins, or shows it again; recorded too. */
export async function setEntryHidden(id: string, hidden: boolean): Promise<ActionResult> {
  return runAdminAction(`/audit-log/${checkedId(id)}/hidden`, hidden ? "PUT" : "DELETE");
}
