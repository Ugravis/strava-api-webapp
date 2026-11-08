import { ADMIN_ROLES, type AdminMeResponse, type AdminPermission, highestAdminRole } from "@kilotrace/shared/admin";

/** Rank of the highest back-office role, -1 without any, as the backend compares them. */
function rankOf(roles: readonly string[]): number {
  const role = highestAdminRole(roles);
  return role ? ADMIN_ROLES.indexOf(role) : -1;
}

export type ActRefusal = "readOnly" | "self" | "protected";

/** The actions of the account panel, each behind its permission. */
export const USER_ACTION_PERMISSIONS = [
  "users.moderate",
  "users.suspend",
  "users.sessions",
  "users.strava",
  "users.delete",
] as const satisfies readonly AdminPermission[];

export type UserActionPermission = (typeof USER_ACTION_PERMISSIONS)[number];

/**
 * Why the current member may not act on an account, null when they may: the
 * backend refuses the same cases, the buttons are only not offered.
 */
export function actRefusal(me: AdminMeResponse, user: { id: string; roles: readonly string[] }): ActRefusal | null {
  if (!USER_ACTION_PERMISSIONS.some((permission) => me.permissions.includes(permission))) return "readOnly";
  if (user.id === me.id) return "self";
  if (rankOf(user.roles) >= rankOf(me.roles)) return "protected";
  return null;
}
