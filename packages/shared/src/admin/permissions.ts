import { AdminRole } from "./roles";

/** Sections of the back office, in the order of the permissions table. */
export const ADMIN_PERMISSION_CATEGORIES = [
  "statistics",
  "users",
  "usernames",
  "badges",
  "audit",
  "system",
  "team",
  "dev",
] as const;

export type AdminPermissionCategory = (typeof ADMIN_PERMISSION_CATEGORIES)[number];

interface AdminPermissionDefinition {
  category: AdminPermissionCategory;
  /** Roles granted it before any change, as the former minimal roles did. */
  defaults: readonly EditableAdminRole[];
  /** Permission needed alongside, e.g. reading a page to act on it. */
  requires?: string;
  /** Super-admin only, never granted to another role: keeps the team from locking itself out. */
  locked?: true;
}

/** Every back-office permission, one per action, grouped by category. */
export const ADMIN_PERMISSIONS = {
  "statistics.view": { category: "statistics", defaults: ["support", "admin"] },
  "users.view": { category: "users", defaults: ["support", "admin"] },
  "users.suspend": { category: "users", defaults: ["admin"], requires: "users.view" },
  "users.moderate": { category: "users", defaults: ["admin"], requires: "users.view" },
  "users.distinctions": { category: "users", defaults: ["admin"], requires: "users.view" },
  "users.sessions": { category: "users", defaults: ["admin"], requires: "users.view" },
  "users.strava": { category: "users", defaults: ["admin"], requires: "users.view" },
  "users.delete": { category: "users", defaults: ["admin"], requires: "users.view" },
  "usernames.view": { category: "usernames", defaults: ["support", "admin"], requires: "users.view" },
  "usernames.manage": { category: "usernames", defaults: ["admin"], requires: "usernames.view" },
  "badges.view": { category: "badges", defaults: ["support", "admin"] },
  "badges.create": { category: "badges", defaults: ["admin"], requires: "badges.view" },
  "badges.edit": { category: "badges", defaults: ["admin"], requires: "badges.view" },
  "badges.delete": { category: "badges", defaults: ["admin"], requires: "badges.view" },
  "audit.view": { category: "audit", defaults: ["admin"] },
  "audit.hide": { category: "audit", defaults: [], requires: "audit.view" },
  "system.view": { category: "system", defaults: ["support", "admin"] },
  "system.maintenance": { category: "system", defaults: [], requires: "system.view" },
  "system.signups": { category: "system", defaults: [], requires: "system.view" },
  "system.uploads": { category: "system", defaults: [], requires: "system.view" },
  "team.view": { category: "team", defaults: ["support", "admin"] },
  "team.manage": { category: "team", defaults: [], requires: "team.view", locked: true },
  "permissions.manage": { category: "team", defaults: [], requires: "team.view", locked: true },
  "dev.view": { category: "dev", defaults: ["support", "admin"] },
} as const satisfies Record<string, AdminPermissionDefinition>;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;

export const ADMIN_PERMISSION_KEYS = Object.keys(ADMIN_PERMISSIONS) as AdminPermission[];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === "string" && Object.hasOwn(ADMIN_PERMISSIONS, value);
}

export function permissionDefinition(
  permission: AdminPermission,
): Omit<AdminPermissionDefinition, "requires"> & { requires?: AdminPermission } {
  return ADMIN_PERMISSIONS[permission];
}

/** Roles whose permissions are stored; super-admins hold every one. */
export const EDITABLE_ADMIN_ROLES = [AdminRole.Support, AdminRole.Admin] as const;

export type EditableAdminRole = (typeof EDITABLE_ADMIN_ROLES)[number];

/** Permissions granted to each editable role. */
export type AdminRoleGrants = Record<EditableAdminRole, AdminPermission[]>;

/** `GET /api/admin/permissions`. */
export interface AdminPermissionsResponse {
  grants: AdminRoleGrants;
}

/** `PUT /api/admin/permissions`: the whole table, refused when a permission lacks what it requires. */
export interface SetRolePermissionsRequest {
  grants: AdminRoleGrants;
}

/** The first permission of `granted` whose requirement or lock is not met, null when all are. */
export function invalidGrant(granted: readonly AdminPermission[]): AdminPermission | null {
  const set = new Set(granted);
  for (const permission of granted) {
    const definition = permissionDefinition(permission);
    if (definition.locked || (definition.requires && !set.has(definition.requires))) {
      return permission;
    }
  }
  return null;
}

/** Permissions of a holder of `roles`: every one for a super-admin, the union of the grants otherwise. */
export function permissionsOf(roles: readonly string[], grants: AdminRoleGrants): AdminPermission[] {
  if (roles.includes(AdminRole.SuperAdmin)) {
    return [...ADMIN_PERMISSION_KEYS];
  }
  const held = new Set(
    EDITABLE_ADMIN_ROLES.filter((role) => roles.includes(role)).flatMap((role) => grants[role]),
  );
  return ADMIN_PERMISSION_KEYS.filter((permission) => held.has(permission) && !permissionDefinition(permission).locked);
}

/** The grants seeded before any change from the Permissions page. */
export const DEFAULT_ADMIN_GRANTS: AdminRoleGrants = {
  support: ADMIN_PERMISSION_KEYS.filter((key) => permissionDefinition(key).defaults.includes("support")),
  admin: ADMIN_PERMISSION_KEYS.filter((key) => permissionDefinition(key).defaults.includes("admin")),
};
