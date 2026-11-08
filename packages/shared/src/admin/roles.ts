/** Back-office roles, from the lowest to the highest: their permissions are set from the Permissions page. */
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

/** True when one of `roles` grants at least the rights of `required`. */
export function hasAdminRole(
  roles: readonly string[],
  required: AdminRole,
): boolean {
  const minimum = ADMIN_ROLES.indexOf(required);
  return roles.some(
    (role) => isAdminRole(role) && ADMIN_ROLES.indexOf(role) >= minimum,
  );
}

/** The highest of `roles`, or null when none is a back-office role. */
export function highestAdminRole(roles: readonly string[]): AdminRole | null {
  for (const role of [...ADMIN_ROLES].reverse()) {
    if (roles.includes(role)) {
      return role;
    }
  }
  return null;
}
