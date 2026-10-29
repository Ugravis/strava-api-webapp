import { AdminRole } from "./roles";

/** Sections of the back office with actions, in the order of the permissions table. */
export const ADMIN_PERMISSION_CATEGORIES = ["users", "usernames", "badges", "userTags", "audit", "system", "team"] as const;

export type AdminPermissionCategory = (typeof ADMIN_PERMISSION_CATEGORIES)[number];

interface AdminPermissionDefinition {
  category: AdminPermissionCategory;
  /** Roles granted it before any change, as the former minimal roles did. */
  defaults: readonly EditableAdminRole[];
  /** Super-admin only, never granted to another role: keeps the team from locking itself out. */
  locked?: true;
}

/**
 * Every back-office permission, one per action, grouped by category. Reading
 * the pages needs none: every member of the team sees them all.
 */
export const ADMIN_PERMISSIONS = {
  "users.suspend": { category: "users", defaults: ["admin"] },
  "users.moderate": { category: "users", defaults: ["admin"] },
  "users.userTags": { category: "users", defaults: ["admin"] },
  "users.sessions": { category: "users", defaults: ["admin"] },
  "users.strava": { category: "users", defaults: ["admin"] },
  "users.delete": { category: "users", defaults: ["admin"] },
  "usernames.manage": { category: "usernames", defaults: ["admin"] },
  "badges.create": { category: "badges", defaults: ["admin"] },
  "badges.edit": { category: "badges", defaults: ["admin"] },
  "badges.delete": { category: "badges", defaults: ["admin"] },
  "userTags.create": { category: "userTags", defaults: ["admin"] },
  "userTags.edit": { category: "userTags", defaults: ["admin"] },
  "userTags.delete": { category: "userTags", defaults: ["admin"] },
  "audit.hide": { category: "audit", defaults: [] },
  "system.maintenance": { category: "system", defaults: [] },
  "system.signups": { category: "system", defaults: [] },
  "system.uploads": { category: "system", defaults: [] },
  "team.manage": { category: "team", defaults: [], locked: true },
  "permissions.manage": { category: "team", defaults: [], locked: true },
} as const satisfies Record<string, AdminPermissionDefinition>;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;

export const ADMIN_PERMISSION_KEYS = Object.keys(ADMIN_PERMISSIONS) as AdminPermission[];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === "string" && Object.hasOwn(ADMIN_PERMISSIONS, value);
}

export function permissionDefinition(permission: AdminPermission): AdminPermissionDefinition {
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

/** `PUT /api/admin/permissions`: the whole table, refused with a permission kept for the super-admins. */
export interface SetRolePermissionsRequest {
  grants: AdminRoleGrants;
}

/** The first permission of `granted` kept for the super-admins, null when none is. */
export function invalidGrant(granted: readonly AdminPermission[]): AdminPermission | null {
  return granted.find((permission) => permissionDefinition(permission).locked) ?? null;
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
