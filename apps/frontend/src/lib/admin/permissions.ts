import "server-only";
import { ADMIN_ROLES, AdminRole, type AdminMeResponse, hasAdminRole, highestAdminRole } from "@kilotrace/shared/admin";

/** Rank of the highest back-office role, -1 without any, as the backend compares them. */
function rankOf(roles: readonly string[]): number {
  const role = highestAdminRole(roles);
  return role ? ADMIN_ROLES.indexOf(role) : -1;
}

export type ActRefusal = "readOnly" | "self" | "protected";

/**
 * Why the current member may not act on an account, null when they may: the
 * backend refuses the same cases, the buttons are only not offered.
 */
export function actRefusal(me: AdminMeResponse, user: { id: string; roles: readonly string[] }): ActRefusal | null {
  if (!hasAdminRole(me.roles, AdminRole.Admin)) return "readOnly";
  if (user.id === me.id) return "self";
  if (rankOf(user.roles) >= rankOf(me.roles)) return "protected";
  return null;
}
