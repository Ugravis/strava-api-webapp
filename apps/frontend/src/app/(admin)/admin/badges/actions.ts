"use server";

import {
  ADMIN_BADGE_SLUG,
  type AdminBadge,
  type AdminBadgeThemeRow,
  type CreateBadgeRequest,
  type CreateBadgeThemeRequest,
  type SetBadgeActiveRequest,
  type UpdateBadgeRequest,
  type UpdateBadgeThemeRequest,
} from "@kilotrace/shared/admin";
import { TABLE_MAX_PAGE_SIZE, type TablePage, type TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import type { TableMove } from "@/components/admin/data-table";
import { type AdminActionResult, runAdminAction } from "@/lib/admin/actions";
import { fetchAdminRow, fetchAdminTable } from "@/lib/admin/table";

/** A page of the table of the badges. */
export async function fetchBadgesTable(query: TableQuery): Promise<TablePage<AdminBadge>> {
  return fetchAdminTable<AdminBadge>("/badges/table", query);
}

/** A page of the table of the collections. */
export async function fetchThemesTable(query: TableQuery): Promise<TablePage<AdminBadgeThemeRow>> {
  return fetchAdminTable<AdminBadgeThemeRow>("/badge-themes/table", query);
}

/** A badge for its detail, null once deleted. */
export async function loadBadge(id: string): Promise<AdminBadge | null> {
  if (!ADMIN_BADGE_SLUG.test(id)) return null;
  return fetchAdminRow<AdminBadge>("/badges/table", id, (badge) => badge.id);
}

/** A collection for its detail, with its badges in their order; null once deleted. */
export async function loadTheme(id: string): Promise<{ theme: AdminBadgeThemeRow; badges: AdminBadge[] } | null> {
  if (!ADMIN_BADGE_SLUG.test(id)) return null;
  const [theme, badges] = await Promise.all([
    fetchAdminRow<AdminBadgeThemeRow>("/badge-themes/table", id, (each) => each.id),
    fetchAdminTable<AdminBadge>("/badges/table", {
      q: "",
      filters: { theme: [id] },
      sort: { id: "position", desc: false },
      groupBy: null,
      folded: [],
      page: 1,
      pageSize: TABLE_MAX_PAGE_SIZE,
    }),
  ]);
  return theme && { theme, badges: badges.entries.flatMap((entry) => ("row" in entry ? [entry.row] : [])) };
}

/*
 * Actions of the badges page, bound to their ids by the page. The backend
 * checks the role and the fields, and records every call.
 */

/** A badge created from its draft, its amounts already stored: its id once created, a refusal under its field. */
export async function createBadge(body: CreateBadgeRequest): Promise<AdminActionResult & { id?: string }> {
  const result = await runAdminAction("/badges", "POST", { ...body, id: body.id.trim(), name: body.name.trim(), description: body.description.trim() }, {
    ID_TAKEN: { field: "id", message: "Un badge porte déjà cet identifiant." },
  });
  return result.ok ? { ...result, id: body.id.trim(), message: `Badge ${body.name.trim()} créé` } : result;
}

/** A change edited in place: every field sent, as the backend replaces them all. */
export async function saveBadge(id: string, body: UpdateBadgeRequest): Promise<ActionResult> {
  return runAdminAction(`/badges/${checkedSlug(id)}`, "PATCH", { ...body, name: body.name.trim(), description: body.description.trim() });
}

export async function setBadgeActive(id: string, active: boolean): Promise<ActionResult> {
  const body: SetBadgeActiveRequest = { active };
  return runAdminAction(`/badges/${checkedSlug(id)}/active`, "PUT", body);
}

/** Deletes a badge for good, `reason` kept in the log. */
export async function deleteBadge(id: string, reason: string | undefined): Promise<ActionResult> {
  return runAdminAction(`/badges/${checkedSlug(id)}`, "DELETE", { reason: reason ?? "" });
}

/** Activates or deactivates the selection one by one, stopping at the first failure. */
export async function setBadgesActive(ids: string[], active: boolean): Promise<ActionResult> {
  let result: ActionResult = { ok: true, message: "" };
  for (const id of ids) {
    result = await setBadgeActive(id, active);
    if (!result.ok) break;
  }
  return result;
}

export async function moveBadge(move: TableMove): Promise<ActionResult> {
  return runAdminAction("/badges/move", "PUT", movedOf(move));
}

/** A collection created from its draft: its id once created, a refusal under its field. */
export async function createTheme(body: CreateBadgeThemeRequest): Promise<AdminActionResult & { id?: string }> {
  const created: CreateBadgeThemeRequest = { id: body.id.trim(), name: body.name.trim() };
  const result = await runAdminAction("/badge-themes", "POST", created, {
    ID_TAKEN: { field: "id", message: "Une collection porte déjà cet identifiant." },
  });
  return result.ok ? { ...result, id: created.id, message: `Collection ${created.name} créée` } : result;
}

/** Renamed in place from the detail. */
export async function saveTheme(id: string, name: string): Promise<ActionResult> {
  const body: UpdateBadgeThemeRequest = { name: name.trim() };
  return runAdminAction(`/badge-themes/${checkedSlug(id)}`, "PATCH", body);
}

/** Deletes a collection, its badges kept without one; `reason` kept in the log. */
export async function deleteTheme(id: string, reason: string | undefined): Promise<ActionResult> {
  return runAdminAction(`/badge-themes/${checkedSlug(id)}`, "DELETE", { reason: reason ?? "" });
}

export async function moveTheme(move: TableMove): Promise<ActionResult> {
  return runAdminAction("/badge-themes/move", "PUT", movedOf(move));
}

/** A move posted by the table, its ids checked. */
function movedOf({ id, after, before }: TableMove): TableMove {
  return { id: checkedSlug(id), after: after && checkedSlug(after), before: before && checkedSlug(before) };
}

/** A slug posted by the page, checked before it reaches a URL. */
function checkedSlug(id: string): string {
  if (typeof id !== "string" || !ADMIN_BADGE_SLUG.test(id)) {
    throw new Error("Invalid id");
  }
  return id;
}
