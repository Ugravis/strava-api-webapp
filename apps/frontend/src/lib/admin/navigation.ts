import "server-only";
import { AdminRole, hasAdminRole } from "@kilotrace/shared/admin";
import { AwardIcon, ChartColumnIcon, GaugeIcon, LogsIcon, type LucideIcon, UsersIcon } from "lucide-react";

/** Kept out of `@/config/routes`, which reaches the browser. */
export const adminRoutes = {
  overview: "/admin",
  statistics: "/admin/statistics",
  users: "/admin/users",
  /** The panel of a user, opened above the current page. */
  user: (id: string) => `/admin/users/${id}`,
  badges: "/admin/badges",
  auditLog: "/admin/audit-log",
} as const;

interface AdminNavItem {
  key: "overview" | "statistics" | "users" | "badges" | "auditLog";
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
  { key: "users", href: adminRoutes.users, icon: UsersIcon, minimum: AdminRole.Support },
  { key: "badges", href: adminRoutes.badges, icon: AwardIcon, minimum: AdminRole.Support },
  { key: "auditLog", href: adminRoutes.auditLog, icon: LogsIcon, minimum: AdminRole.Admin },
];

/** Entries of the back-office navigation the roles grant. */
export function adminNavFor(roles: readonly AdminRole[]): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => hasAdminRole(roles, item.minimum));
}
