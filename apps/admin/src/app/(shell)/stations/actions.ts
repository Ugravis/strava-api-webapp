"use server";

import type { AdminStation, AdminStationNeighbor, HideStationRequest, RenameStationRequest } from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
import { fetchAdminTable } from "@/lib/admin/table";

/*
 * Actions of the stations page. The backend checks the permission and the
 * fields, and records every change.
 */

/** A page of the table of the stations. */
export async function fetchStationsTable(query: TableQuery): Promise<TablePage<AdminStation>> {
  return fetchAdminTable<AdminStation>("/stations/table", query);
}

/** A station for its detail, null when it is gone. */
export async function loadStation(id: string): Promise<AdminStation | null> {
  const result = await adminApi<AdminStation>(`/stations/${checkedId(id)}`);
  if (result.ok) return result.data;
  if (result.status === 404) return null;
  throw new Error(`Admin station ${id}: ${result.status}`);
}

/** The stations linked to a station by the railway, the nearest first. */
export async function loadStationNeighbors(id: string): Promise<AdminStationNeighbor[]> {
  const result = await adminApi<AdminStationNeighbor[]>(`/stations/${checkedId(id)}/neighbors`);
  if (!result.ok) throw new Error(`Admin station neighbors ${id}: ${result.status}`);
  return result.data;
}

/** Its name for the site, null for the one of OpenStreetMap again. */
export async function renameStation(id: string, name: string | null): Promise<ActionResult> {
  const body: RenameStationRequest = { name };
  return runAdminAction(`/stations/${checkedId(id)}`, "PATCH", body);
}

/** Hidden from the site or shown again, `reason` kept in the log. */
export async function hideStation(id: string, hidden: boolean, reason: string | undefined): Promise<ActionResult> {
  const body: HideStationRequest = { hidden, ...(reason && { reason }) };
  return runAdminAction(`/stations/${checkedId(id)}/hidden`, "PUT", body);
}

/** An id posted by the page, checked before it reaches a URL. */
function checkedId(id: string): string {
  if (typeof id !== "string" || !/^[1-9]\d{0,9}$/.test(id)) {
    throw new Error("Invalid id");
  }
  return id;
}
