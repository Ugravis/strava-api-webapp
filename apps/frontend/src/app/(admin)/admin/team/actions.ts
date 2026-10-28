"use server";

import { type AdminTeamCandidate, isAdminRole, type SetTeamRoleRequest } from "@kilotrace/shared/admin";
import type { ActionResult } from "@/components/admin/action-state";
import type { UserOption } from "@/components/admin/form-dialog";
import { checkedId, runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";

/*
 * Actions of the permissions page. The backend checks the role (super-admin)
 * and the fields, and records every change.
 */

export async function searchCandidates(query: string): Promise<UserOption[]> {
  const result = await adminApi<AdminTeamCandidate[]>(`/team/candidates?q=${encodeURIComponent(query.slice(0, 100))}`).catch(
    () => null,
  );
  return result?.ok ? result.data.map(({ email, ...user }) => ({ ...user, hint: email })) : [];
}

export async function addMember(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return setRole(checkedId(String(formData.get("user") ?? "")), formData);
}

export async function changeRole(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return setRole(checkedId(id), formData);
}

export async function removeMember(id: string): Promise<ActionResult> {
  return runAdminAction(`/team/${checkedId(id)}`, "DELETE");
}

async function setRole(id: string, formData: FormData): Promise<ActionResult> {
  const role = formData.get("role");
  const body: SetTeamRoleRequest = { role: isAdminRole(role) ? role : "support" };
  return runAdminAction(`/team/${id}`, "PUT", body);
}
