"use server";

import {
  ADMIN_BADGE_SLUG,
  type AdminUserSummary,
  type AdminUserTag,
  type CreateUserTagRequest,
  type UpdateUserTagRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import type { TableMove } from "@/components/admin/data-table";
import { type AdminActionResult, runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";
import { fetchAdminRow, fetchAdminTable } from "@/lib/admin/table";

/** The accounts of a tag loaded at once in its detail. */
const HOLDERS_PAGE = 10;

/** A page of the table of the user tags. */
export async function fetchUserTagsTable(query: TableQuery): Promise<TablePage<AdminUserTag>> {
  return fetchAdminTable<AdminUserTag>("/user-tags/table", query);
}

/** A user tag for its detail, null once deleted. */
export async function loadUserTag(id: string): Promise<AdminUserTag | null> {
  if (!ADMIN_BADGE_SLUG.test(id)) return null;
  return fetchAdminRow<AdminUserTag>("/user-tags/table", id, (userTag) => userTag.id);
}

/*
 * Actions of the user tags page, bound to their ids by the page. The
 * backend checks the permission and the fields, and records every call.
 */

/** A user tag being typed: every field may still be empty. */
export interface UserTagDraft {
  id: string | null;
  name: string | null;
  description: string | null;
  icon: string | null;
  color: string | null;
}

/** A user tag created from its draft: its id once created, a refusal under its field. */
export async function createUserTag(draft: UserTagDraft): Promise<AdminActionResult & { id?: string }> {
  const body: CreateUserTagRequest = {
    id: (draft.id ?? "").trim(),
    name: (draft.name ?? "").trim(),
    description: draft.description?.trim() || null,
    icon: draft.icon ?? "",
    color: draft.color || null,
  };
  const result = await runAdminAction("/user-tags", "POST", body, {
    ID_TAKEN: { field: "id", message: getAdminTranslations("userTags.errors")("idTaken") },
  });
  return result.ok ? { ...result, id: body.id, message: `Tag ${body.name} créé` } : result;
}

/** A change edited in place: every field sent, as the backend replaces them all. */
export async function saveUserTag(id: string, body: UpdateUserTagRequest): Promise<ActionResult> {
  const update: UpdateUserTagRequest = {
    name: body.name.trim(),
    description: body.description?.trim() || null,
    icon: body.icon,
    color: body.color || null,
  };
  return runAdminAction(`/user-tags/${checkedSlug(id)}`, "PATCH", update);
}

/** Deletes a user tag for good, `reason` kept in the log. */
export async function deleteUserTag(id: string, reason: string | undefined): Promise<ActionResult> {
  return runAdminAction(`/user-tags/${checkedSlug(id)}`, "DELETE", { reason: reason ?? "" }, { SYSTEM_USER_TAG: getAdminTranslations("userTags.errors")("system") });
}

/** The accounts holding a user tag, the latest first, from `offset`: its related rows. */
export async function loadUserTagHolders(id: string, offset: number): Promise<{ users: AdminUserSummary[]; total: number }> {
  const page = await fetchAdminTable<AdminUserSummary>("/users/table", {
    q: "",
    filters: { userTags: [checkedSlug(id)] },
    sort: { id: "createdAt", desc: true },
    groupBy: null,
    folded: [],
    page: Math.floor(offset / HOLDERS_PAGE) + 1,
    pageSize: HOLDERS_PAGE,
  });
  return { users: page.entries.flatMap((entry) => ("row" in entry ? [entry.row] : [])), total: page.total };
}

export async function moveUserTag({ id, after, before }: TableMove): Promise<ActionResult> {
  const body: TableMove = { id: checkedSlug(id), after: after && checkedSlug(after), before: before && checkedSlug(before) };
  return runAdminAction("/user-tags/move", "PUT", body);
}

/** A slug posted by the page, checked before it reaches a URL. */
function checkedSlug(id: string): string {
  if (typeof id !== "string" || !ADMIN_BADGE_SLUG.test(id)) {
    throw new Error("Invalid id");
  }
  return id;
}
