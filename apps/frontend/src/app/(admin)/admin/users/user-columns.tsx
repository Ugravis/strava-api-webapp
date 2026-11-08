"use client";

import { type AdminUserSummary, type AdminUserTagLook, highestAdminRole, type ModeratableField } from "@kilotrace/shared/admin";
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
import type { ReactNode } from "react";
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
} from "@kilotrace/ui/components/admin/data-table";
import type { DetailFieldEdit } from "@kilotrace/ui/components/admin/detail";
import { GoogleIcon } from "@kilotrace/ui/components/auth/google-icon";
import { BadgeIcon } from "@kilotrace/ui/components/distances/badge-icon";
import { StravaIcon } from "@kilotrace/ui/components/strava/strava-icon";
import { cn } from "@kilotrace/ui/lib/utils";
import { setUserTags } from "./actions";
import { bumpUsers } from "./users-store";

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

/**
 * The tags of an account, picked among the `catalog`. `locked`: not for this
 * member, and why.
 */
export function tagsEdit(user: AdminUserSummary, catalog: AdminUserTagLook[], locked: string | null): DetailFieldEdit<"multiselect"> {
  const held = user.userTags.map((tag) => tag.id);
  return {
    kind: "multiselect",
    value: held,
    options: catalog.map((tag) => ({ value: tag.id, label: tag.name, icon: <UserTagIcon tag={tag} /> })),
    locked,
    onSave: async (next) => {
      const result = await setUserTags(user.id, held, next);
      if (result.ok) bumpUsers();
      return result;
    },
  };
}

/**
 * What the columns act with, else they only draw: `moderate` the gavel of
 * a moderable field holding a value (null when the member may not), `tags`
 * the edit of the tags.
 */
export interface UserColumnActs {
  moderate?: (user: AdminUserSummary, field: ModeratableField) => ReactNode;
  tags?: (user: AdminUserSummary) => DetailFieldEdit;
}

/** The columns of the accounts, shared by their table and their detail. */
export const userColumns = ({ moderate, tags }: UserColumnActs = {}): DataTableColumn<AdminUserSummary>[] => [
  userColumn({
    id: "user",
    header: "Utilisateur",
    icon: <AtSignIcon />,
    sortable: true,
    value: (user) => user,
    marks: (user) => <UserMarks user={user} />,
    tools: (user) => moderate?.(user, "username"),
  }),
  imageColumn({
    id: "avatar",
    header: "Photo",
    icon: <ImageIcon />,
    value: (user) => (user.avatarUrl ? { src: user.avatarUrl, alt: `Photo de @${user.username}` } : null),
    tools: (user) => user.avatarUrl && moderate?.(user, "avatar"),
  }),
  textColumn({
    id: "displayName",
    header: "Nom affiché",
    icon: <TypeIcon />,
    sortable: true,
    value: (user) => user.displayName,
    width: "max-w-44",
    tools: (user) => user.displayName && moderate?.(user, "displayName"),
  }),
  pillsColumn({ id: "roles", header: "Rôle", icon: <ShieldUserIcon />, value: (user) => user.roles.map((role) => ROLES[role]!).filter(Boolean) }),
  statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: statusOf, statuses: STATUSES }),
  textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, sortable: true, value: (user) => user.email, muted: true, width: "max-w-52" }),
  dateColumn({ id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortable: true, value: (user) => user.createdAt }),
  dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (user) => user.lastSeenAt, relative: true }),
  iconsColumn({ id: "connections", header: "Connexions", icon: <LinkIcon />, sortable: true, value: connectionItems }),
  iconsColumn({ id: "userTags", header: "Tags", icon: <TagIcon />, sortable: true, value: tagItems, edit: tags }),
  numberColumn({ id: "activities", header: "Activités", icon: <ActivityIcon />, sortable: true, value: (user) => user.activitiesCount }),
  codeColumn({ id: "id", header: "ID", icon: <HashIcon />, sortable: true, value: (user) => user.id, width: "max-w-20" }),
];
