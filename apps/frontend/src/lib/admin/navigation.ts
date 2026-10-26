import "server-only";
import { AdminRole, hasAdminRole } from "@kilotrace/shared/admin";

/** Kept out of `@/config/routes`, which reaches the browser. */
export const adminRoutes = {
  overview: "/admin",
} as const;

interface AdminNavItem {
  key: keyof typeof adminRoutes;
  href: string;
  /** Lowest role that sees the entry, as on the backend route it calls. */
  minimum: AdminRole;
}

const ADMIN_NAV: readonly AdminNavItem[] = [{ key: "overview", href: adminRoutes.overview, minimum: AdminRole.Support }];

/** Entries of the back-office navigation the roles grant. */
export function adminNavFor(roles: readonly AdminRole[]): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => hasAdminRole(roles, item.minimum));
}
