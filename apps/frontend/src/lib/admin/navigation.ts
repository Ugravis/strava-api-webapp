import "server-only";
import type { AdminNavigationCounts } from "@kilotrace/shared/admin";
import { BoltIcon, ChartColumnIcon, GaugeIcon, GitCommitHorizontalIcon, ListClockIcon, type LucideIcon, PackageIcon, ShieldCogCornerIcon, TagIcon, TrophyIcon, UsersIcon } from "lucide-react";

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
  development: "/admin/development",
  /** Prototypes of the back office, kept as showcases. */
  adminTablePoc: "/admin/development/admin-table",
} as const;

interface AdminNavItem {
  key: "dashboard" | "statistics" | "users" | "badges" | "userTags" | "auditLog" | "system" | "team" | "dev" | "development";
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
      { key: "badges", href: adminRoutes.badges, icon: TrophyIcon, count: "badges" },
      { key: "userTags", href: adminRoutes.userTags, icon: TagIcon, count: "userTags" },
    ],
  },
  {
    key: "infrastructure",
    items: [
      { key: "system", href: adminRoutes.system, icon: BoltIcon },
      { key: "dev", href: adminRoutes.dev, icon: PackageIcon },
      { key: "development", href: adminRoutes.development, icon: GitCommitHorizontalIcon },
    ],
  },
  {
    key: "security",
    items: [
      { key: "auditLog", href: adminRoutes.auditLog, icon: ListClockIcon },
      { key: "team", href: adminRoutes.team, icon: ShieldCogCornerIcon },
    ],
  },
];
