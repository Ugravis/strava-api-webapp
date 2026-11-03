"use server";

import {
  type AdminTeamCandidate,
  type AdminTeamMember,
  EDITABLE_ADMIN_ROLES,
  isAdminPermission,
  isAdminRole,
  type SetRolePermissionsRequest,
  type SetTeamRoleRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import type { DetailEditOption } from "@/components/admin/detail";
import { type AdminActionResult, checkedId, runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { fetchAdminTable } from "@/lib/admin/table";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * Actions of the permissions page. The backend checks the permissions
 * and the fields, and records every change.
 */

/** A page of the table of the team. */
export async function fetchTeamTable(query: TableQuery): Promise<TablePage<AdminTeamMember>> {
  return fetchAdminTable<AdminTeamMember>("/team/table", query);
}

/** A member of the team, null when the account is not one (any more). */
export async function loadTeamMember(id: string): Promise<AdminTeamMember | null> {
  if (!UUID.test(id)) return null;
  const result = await adminApi<AdminTeamMember>(`/team/${id}`);
  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error(`Team member ${result.status}`);
  }
  return result.data;
}

/** Accounts outside the team, picked in the draft of a new member: their @username told after their name. */
export async function searchCandidates(query: string): Promise<DetailEditOption[]> {
  const result = await adminApi<AdminTeamCandidate[]>(`/team/candidates?q=${encodeURIComponent(query.slice(0, 100))}`);
  if (!result.ok) throw new Error(`Candidates ${result.status}`);
  return result.data.map((user) => ({ value: user.id, label: user.displayName ?? `@${user.username}`, description: `@${user.username} · ${user.email}` }));
}

export interface MemberDraft {
  user: DetailEditOption | null;
  role: string | null;
}

/** Adds the account picked to the team, with the role chosen. */
export async function addMember(draft: MemberDraft): Promise<AdminActionResult & { id?: string }> {
  if (!draft.user) return { ok: false, field: "user", message: "Champ obligatoire." };
  const id = checkedId(draft.user.value);
  const result = await setRole(id, draft.role);
  return result.ok ? { ...result, id, message: `${draft.user.label} ajouté à l'équipe` } : result;
}

export async function changeRole(id: string, role: string | null): Promise<ActionResult> {
  return setRole(checkedId(id), role);
}

export async function removeMember(id: string): Promise<ActionResult> {
  return runAdminAction(`/team/${checkedId(id)}`, "DELETE");
}

async function setRole(id: string, role: string | null): Promise<ActionResult> {
  const body: SetTeamRoleRequest = { role: isAdminRole(role) ? role : "support" };
  return runAdminAction(`/team/${id}`, "PUT", body);
}

/** The whole table of the roles below super-admin, as edited in the matrix. */
export async function savePermissions(grants: Record<string, unknown>): Promise<ActionResult> {
  const body = {
    grants: Object.fromEntries(
      EDITABLE_ADMIN_ROLES.map((role) => {
        const granted = grants[role];
        return [role, Array.isArray(granted) ? granted.filter(isAdminPermission) : []];
      }),
    ),
  } as SetRolePermissionsRequest;
  return runAdminAction("/permissions", "PUT", body, {
    INVALID_PERMISSIONS: getAdminTranslations("team.permissions")("invalid"),
  });
}
