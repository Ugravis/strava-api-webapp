import "server-only";
import { type AdminMeResponse, type AdminPermission, type AdminRole, hasAdminRole } from "@kilotrace/shared/admin";
import { notFound, redirect } from "next/navigation";
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
 * Roles of the current user when one of them reaches `minimum`; the 404 of
 * an unknown page to a member below it, the sign-in to anyone else.
 */
export async function requireAdminRole(minimum: AdminRole): Promise<AdminRole[]> {
  const roles = (await requireAdminMember()).roles;
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
 * otherwise the sign-in: a session expired, revoked or whose last role was
 * withdrawn is refused by the backend.
 */
export async function requireAdminMember(): Promise<AdminMeResponse> {
  const me = await getAdminMe();
  if (!me || me.roles.length === 0) {
    redirect("/login");
  }
  return me;
}
