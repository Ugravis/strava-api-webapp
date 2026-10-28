import "server-only";
import type { AdminPermission } from "@kilotrace/shared/admin";
import { AwardIcon, ChartColumnIcon, CodeIcon, GaugeIcon, GitCommitHorizontalIcon, KeyRoundIcon, LogsIcon, type LucideIcon, UsersIcon, WrenchIcon } from "lucide-react";

/** Kept out of `@/config/routes`, which reaches the browser. */
export const adminRoutes = {
  overview: "/admin",
  statistics: "/admin/statistics",
  users: "/admin/users",
  /** The panel of a user, opened above the current page. */
  user: (id: string) => `/admin/users/${id}`,
  badges: "/admin/badges",
  auditLog: "/admin/audit-log",
  system: "/admin/system",
  team: "/admin/team",
  dev: "/admin/dev",
  commits: "/admin/commits",
} as const;

interface AdminNavItem {
  key: "overview" | "statistics" | "users" | "badges" | "auditLog" | "system" | "team" | "dev" | "commits";
  href: string;
  icon: LucideIcon;
  /** Permission that shows the entry, as on the backend route it calls; none for every member. */
  permission: AdminPermission | null;
  /** Active on its own path only, not on the pages below it. */
  exact?: boolean;
}

const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: "overview", href: adminRoutes.overview, icon: GaugeIcon, permission: null, exact: true },
  { key: "statistics", href: adminRoutes.statistics, icon: ChartColumnIcon, permission: "statistics.view" },
  { key: "users", href: adminRoutes.users, icon: UsersIcon, permission: "users.view" },
  { key: "badges", href: adminRoutes.badges, icon: AwardIcon, permission: "badges.view" },
  { key: "auditLog", href: adminRoutes.auditLog, icon: LogsIcon, permission: "audit.view" },
  { key: "system", href: adminRoutes.system, icon: WrenchIcon, permission: "system.view" },
  { key: "team", href: adminRoutes.team, icon: KeyRoundIcon, permission: "team.view" },
  { key: "dev", href: adminRoutes.dev, icon: CodeIcon, permission: "dev.view" },
  { key: "commits", href: adminRoutes.commits, icon: GitCommitHorizontalIcon, permission: "dev.view" },
];

/** Entries of the back-office navigation the permissions grant. */
export function adminNavFor(permissions: readonly AdminPermission[]): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => !item.permission || permissions.includes(item.permission));
}
