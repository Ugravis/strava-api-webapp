import "server-only";
import { type AdminMeResponse, type AdminPermission, type AdminRole, hasAdminRole } from "@kilotrace/shared/admin";
import { notFound } from "next/navigation";
import { cache } from "react";
import { adminApi } from "./api";

/** The current member of the team, null for anyone else. Deduplicated within a request. */
export const getAdminMe = cache(async (): Promise<AdminMeResponse | null> => {
  // Also asked by the sidebar of every page: an unreachable backend must not break it.
  const result = await adminApi<AdminMeResponse>("/me").catch(() => null);
  return result?.ok ? result.data : null;
});

/** Back-office roles of the current user, empty for anyone else. */
export async function getAdminRoles(): Promise<AdminRole[]> {
  return (await getAdminMe())?.roles ?? [];
}

/**
 * Roles of the current user when one of them reaches `minimum`; otherwise
 * the 404 of an unknown page, so that the back office stays undisclosed.
 */
export async function requireAdminRole(minimum: AdminRole): Promise<AdminRole[]> {
  const roles = await getAdminRoles();
  if (!hasAdminRole(roles, minimum)) {
    notFound();
  }
  return roles;
}

/** Permissions of the current user, empty for anyone else. */
export async function getAdminPermissions(): Promise<AdminPermission[]> {
  return (await getAdminMe())?.permissions ?? [];
}

/**
 * The current member of the team, who sees every page of the back office;
 * otherwise the 404 of an unknown page, as for a missing role.
 */
export async function requireAdminMember(): Promise<AdminMeResponse> {
  const me = await getAdminMe();
  if (!me || me.roles.length === 0) {
    notFound();
  }
  return me;
}
