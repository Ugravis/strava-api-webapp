"use server";

import {
  ADMIN_BADGE_SLUG,
  type AdminUserTag,
  type CreateUserTagRequest,
  type UpdateUserTagRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import type { TableMove } from "@/components/admin/data-table";
import { reasonOf, runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";
import { fetchAdminRow, fetchAdminTable } from "@/lib/admin/table";

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

export async function createUserTag(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: CreateUserTagRequest = { id: text(formData, "id"), ...userTagOf(formData) };
  return runAdminAction("/user-tags", "POST", body, {
    ID_TAKEN: getAdminTranslations("userTags.errors")("idTaken"),
  });
}

export async function updateUserTag(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: UpdateUserTagRequest = userTagOf(formData);
  return runAdminAction(`/user-tags/${checkedSlug(id)}`, "PATCH", body);
}

/** The same, edited in place from the detail: every field sent, as the backend replaces them all. */
export async function saveUserTag(id: string, body: UpdateUserTagRequest): Promise<ActionResult> {
  const update: UpdateUserTagRequest = {
    name: body.name.trim(),
    description: body.description?.trim() || null,
    icon: body.icon,
    color: body.color || null,
  };
  return runAdminAction(`/user-tags/${checkedSlug(id)}`, "PATCH", update);
}

export async function deleteUserTag(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(
    `/user-tags/${checkedSlug(id)}`,
    "DELETE",
    { reason: reasonOf(formData) ?? "" },
    { SYSTEM_USER_TAG: getAdminTranslations("userTags.errors")("system") },
  );
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

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function userTagOf(formData: FormData): UpdateUserTagRequest {
  return {
    name: text(formData, "name"),
    description: text(formData, "description") || null,
    icon: text(formData, "icon"),
    color: text(formData, "color") || null,
  };
}
