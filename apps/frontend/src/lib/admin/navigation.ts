import "server-only";
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
  /** Active on its own path only, not on the pages below it. */
  exact?: boolean;
}

/** Entries of the back-office navigation, the same for every member of the team. */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: "overview", href: adminRoutes.overview, icon: GaugeIcon, exact: true },
  { key: "statistics", href: adminRoutes.statistics, icon: ChartColumnIcon },
  { key: "users", href: adminRoutes.users, icon: UsersIcon },
  { key: "badges", href: adminRoutes.badges, icon: AwardIcon },
  { key: "auditLog", href: adminRoutes.auditLog, icon: LogsIcon },
  { key: "system", href: adminRoutes.system, icon: WrenchIcon },
  { key: "team", href: adminRoutes.team, icon: KeyRoundIcon },
  { key: "dev", href: adminRoutes.dev, icon: CodeIcon },
  { key: "commits", href: adminRoutes.commits, icon: GitCommitHorizontalIcon },
];
