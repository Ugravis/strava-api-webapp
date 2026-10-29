import "server-only";
import type { AdminNavigationCounts } from "@kilotrace/shared/admin";
import { AwardIcon, ChartColumnIcon, CodeIcon, GaugeIcon, GitCommitHorizontalIcon, KeyRoundIcon, LogsIcon, type LucideIcon, TagIcon, UsersIcon, WrenchIcon } from "lucide-react";

/** Kept out of `@/config/routes`, which reaches the browser. */
export const adminRoutes = {
  /** Entry of the back office, redirected to its dashboard. */
  index: "/admin",
  dashboard: "/admin/dashboard",
  statistics: "/admin/statistics",
  users: "/admin/users",
  /** The panel of a user, opened above the current page. */
  user: (id: string) => `/admin/users/${id}`,
  badges: "/admin/badges",
  userTags: "/admin/user-tags",
  auditLog: "/admin/audit-log",
  system: "/admin/system",
  team: "/admin/team",
  dev: "/admin/dev",
  commits: "/admin/commits",
} as const;

interface AdminNavItem {
  key: "dashboard" | "statistics" | "users" | "badges" | "userTags" | "auditLog" | "system" | "team" | "dev" | "commits";
  href: string;
  icon: LucideIcon;
  /** Figure shown in a pill next to the entry. */
  count?: keyof AdminNavigationCounts;
}

interface AdminNavGroup {
  key: "general" | "community" | "infrastructure" | "security";
  items: readonly AdminNavItem[];
}

/** Entries of the back-office navigation by group, the same for every member of the team. */
export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    key: "general",
    items: [
      { key: "dashboard", href: adminRoutes.dashboard, icon: GaugeIcon },
      { key: "statistics", href: adminRoutes.statistics, icon: ChartColumnIcon },
    ],
  },
  {
    key: "community",
    items: [
      { key: "users", href: adminRoutes.users, icon: UsersIcon, count: "users" },
      { key: "badges", href: adminRoutes.badges, icon: AwardIcon, count: "badges" },
      { key: "userTags", href: adminRoutes.userTags, icon: TagIcon, count: "userTags" },
    ],
  },
  {
    key: "infrastructure",
    items: [
      { key: "system", href: adminRoutes.system, icon: WrenchIcon },
      { key: "dev", href: adminRoutes.dev, icon: CodeIcon },
      { key: "commits", href: adminRoutes.commits, icon: GitCommitHorizontalIcon },
    ],
  },
  {
    key: "security",
    items: [
      { key: "auditLog", href: adminRoutes.auditLog, icon: LogsIcon },
      { key: "team", href: adminRoutes.team, icon: KeyRoundIcon },
    ],
  },
];
