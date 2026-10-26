import "server-only";
import { type AdminMeResponse, type AdminRole, hasAdminRole } from "@kilotrace/shared/admin";
import { notFound } from "next/navigation";
import { cache } from "react";
import { adminApi } from "./api";

/** Back-office roles of the current user, empty for anyone else. Deduplicated within a request. */
export const getAdminRoles = cache(async (): Promise<AdminRole[]> => {
  // Also asked by the sidebar of every page: an unreachable backend must not break it.
  const result = await adminApi<AdminMeResponse>("/me").catch(() => null);
  return result?.ok ? result.data.roles : [];
});

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
