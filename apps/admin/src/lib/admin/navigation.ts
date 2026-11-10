import "server-only";
import type { AdminNavigationCounts } from "@kilotrace/shared/admin";
import { ActivityIcon, AtSignIcon, BoltIcon, ChartColumnIcon, GaugeIcon, GitCommitHorizontalIcon, ListClockIcon, type LucideIcon, PackageIcon, ReceiptTextIcon, ShieldCogCornerIcon, TagIcon, TrophyIcon, UsersIcon } from "lucide-react";

/** Kept out of `@/config/routes`, which reaches the browser. */
export const adminRoutes = {
  /** Entry of the back office, redirected to its dashboard. */
  index: "/",
  dashboard: "/dashboard",
  statistics: "/statistics",
  /** Temporary charts of the site activity, replaced by a real dashboard. */
  siteActivity: "/site-activity",
  users: "/users",
  badges: "/badges",
  userTags: "/user-tags",
  releaseNotes: "/release-notes",
  reservedUsernames: "/reserved-usernames",
  auditLog: "/audit-log",
  system: "/system",
  team: "/team",
  dev: "/dev",
  development: "/development",
  /** Prototypes of the back office, kept as showcases. */
  adminTablePoc: "/development/admin-table",
  stationZonesPoc: "/development/station-zones",
} as const;

interface AdminNavItem {
  key: "dashboard" | "statistics" | "siteActivity" | "users" | "reservedUsernames" | "badges" | "userTags" | "auditLog" | "system" | "releaseNotes" | "team" | "dev" | "development";
  href: string;
  icon: LucideIcon;
  /** Figure shown in a pill next to the entry. */
  count?: keyof AdminNavigationCounts;
  /** Figure waiting for the team, in a red pill beside it, shown from 1. */
  alert?: keyof AdminNavigationCounts;
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
      { key: "siteActivity", href: adminRoutes.siteActivity, icon: ActivityIcon },
    ],
  },
  {
    key: "community",
    items: [
      { key: "users", href: adminRoutes.users, icon: UsersIcon, count: "users", alert: "openReports" },
      { key: "reservedUsernames", href: adminRoutes.reservedUsernames, icon: AtSignIcon, count: "reservedUsernames" },
      { key: "badges", href: adminRoutes.badges, icon: TrophyIcon, count: "badges" },
      { key: "userTags", href: adminRoutes.userTags, icon: TagIcon, count: "userTags" },
    ],
  },
  {
    key: "infrastructure",
    items: [
      { key: "system", href: adminRoutes.system, icon: BoltIcon },
      { key: "releaseNotes", href: adminRoutes.releaseNotes, icon: ReceiptTextIcon },
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
