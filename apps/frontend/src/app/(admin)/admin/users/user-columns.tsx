"use client";

import { type AdminUserSummary, type AdminUserTagLook, highestAdminRole } from "@kilotrace/shared/admin";
import {
  ActivityIcon,
  AtSignIcon,
  BanIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  ClockIcon,
  HashIcon,
  ImageIcon,
  KeyRoundIcon,
  LinkIcon,
  MailIcon,
  ShieldIcon,
  ShieldUserIcon,
  TagIcon,
  TypeIcon,
} from "lucide-react";
import {
  codeColumn,
  type DataTableColumn,
  dateColumn,
  type IconItem,
  iconsColumn,
  imageColumn,
  Mark,
  numberColumn,
  pillsColumn,
  statusColumn,
  textColumn,
  type Tone,
  userColumn,
} from "@/components/admin/data-table";
import { GoogleIcon } from "@/components/auth/google-icon";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { cn } from "@/lib/utils";

/*
 * How an account is drawn, shared by its table and its detail.
 */

export type Status = "active" | "suspended";

export const STATUSES: Record<Status, { label: string; tone: Tone }> = {
  active: { label: "Actif", tone: "green" },
  suspended: { label: "Suspendu", tone: "red" },
};

export const ROLES: Record<string, { label: string; tone: Tone }> = {
  support: { label: "Support", tone: "gray" },
  admin: { label: "Admin", tone: "blue" },
  "super-admin": { label: "Super-admin", tone: "violet" },
};

export const CONNECTIONS = {
  strava: { label: "Strava", icon: <StravaIcon className="text-[#fc4c02]" /> },
  google: { label: "Google", icon: <GoogleIcon /> },
  password: { label: "E-mail et mot de passe", icon: <KeyRoundIcon className="text-muted-foreground" /> },
};

const statusOf = (user: AdminUserSummary): Status => (user.suspension ? "suspended" : "active");

export function UserMarks({ user }: { user: AdminUserSummary }) {
  const role = highestAdminRole(user.roles);
  return (
    <>
      {role && <Mark {...ROLES[role]!} icon={<ShieldIcon />} />}
      {user.suspension && <Mark label={STATUSES.suspended.label} tone="red" icon={<BanIcon />} />}
    </>
  );
}

const connectionItems = (user: AdminUserSummary): IconItem[] =>
  [...(user.stravaConnected ? ["strava" as const] : []), ...user.signInMethods].map((key) => ({ key, ...CONNECTIONS[key] }));

export function UserTagIcon({ tag }: { tag: AdminUserTagLook }) {
  return <BadgeIcon icon={tag.icon} className={cn(!tag.color && "text-muted-foreground")} style={tag.color ? { color: tag.color } : undefined} aria-hidden />;
}

const tagItems = (user: AdminUserSummary): IconItem[] => user.userTags.map((tag) => ({ key: tag.id, label: tag.name, icon: <UserTagIcon tag={tag} /> }));

export const USER_COLUMNS: DataTableColumn<AdminUserSummary>[] = [
  userColumn({ id: "user", header: "Utilisateur", icon: <AtSignIcon />, sortable: true, value: (user) => user, marks: (user) => <UserMarks user={user} /> }),
  imageColumn({ id: "avatar", header: "Photo", icon: <ImageIcon />, value: (user) => (user.avatarUrl ? { src: user.avatarUrl, alt: `Photo de @${user.username}` } : null) }),
  textColumn({ id: "displayName", header: "Nom affiché", icon: <TypeIcon />, sortable: true, value: (user) => user.displayName, width: "max-w-44" }),
  pillsColumn({ id: "roles", header: "Rôle", icon: <ShieldUserIcon />, value: (user) => user.roles.map((role) => ROLES[role]!).filter(Boolean) }),
  statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: statusOf, statuses: STATUSES }),
  textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, sortable: true, value: (user) => user.email, muted: true, width: "max-w-52" }),
  dateColumn({ id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortable: true, value: (user) => user.createdAt }),
  dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (user) => user.lastSeenAt, relative: true }),
  iconsColumn({ id: "connections", header: "Connexions", icon: <LinkIcon />, sortable: true, value: connectionItems }),
  iconsColumn({ id: "userTags", header: "Tags", icon: <TagIcon />, sortable: true, value: tagItems }),
  numberColumn({ id: "activities", header: "Activités", icon: <ActivityIcon />, sortable: true, value: (user) => user.activitiesCount }),
  codeColumn({ id: "id", header: "ID", icon: <HashIcon />, sortable: true, value: (user) => user.id, width: "max-w-20" }),
];
