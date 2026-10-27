import "server-only";
import { AdminRole, hasAdminRole } from "@kilotrace/shared/admin";
import { ChartColumnIcon, GaugeIcon, type LucideIcon } from "lucide-react";

/** Kept out of `@/config/routes`, which reaches the browser. */
export const adminRoutes = {
  overview: "/admin",
  statistics: "/admin/statistics",
} as const;

interface AdminNavItem {
  key: keyof typeof adminRoutes;
  href: string;
  icon: LucideIcon;
  /** Lowest role that sees the entry, as on the backend route it calls. */
  minimum: AdminRole;
  /** Active on its own path only, not on the pages below it. */
  exact?: boolean;
}

const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: "overview", href: adminRoutes.overview, icon: GaugeIcon, minimum: AdminRole.Support, exact: true },
  { key: "statistics", href: adminRoutes.statistics, icon: ChartColumnIcon, minimum: AdminRole.Support },
];

/** Entries of the back-office navigation the roles grant. */
export function adminNavFor(roles: readonly AdminRole[]): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => hasAdminRole(roles, item.minimum));
}
