/** Back-office roles, each one granting everything the lower ones grant. */
export const AdminRole = {
  Support: "support",
  Admin: "admin",
  SuperAdmin: "super-admin",
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

/** From the lowest to the highest role. */
export const ADMIN_ROLES: readonly AdminRole[] = [
  AdminRole.Support,
  AdminRole.Admin,
  AdminRole.SuperAdmin,
];

export function isAdminRole(value: unknown): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

/** True when `role` grants at least the rights of `required`. */
export function hasAdminRole(role: AdminRole, required: AdminRole): boolean {
  return ADMIN_ROLES.indexOf(role) >= ADMIN_ROLES.indexOf(required);
}
