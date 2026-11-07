"use client";

import type { AuditUser } from "@kilotrace/shared/admin";
import {
  ArrowRightIcon,
  ArrowUpDownIcon,
  AtSignIcon,
  BadgeMinusIcon,
  BadgePlusIcon,
  BanIcon,
  CalendarClockIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CrownIcon,
  DoorOpenIcon,
  EyeOffIcon,
  FilePenIcon,
  FilePlusIcon,
  FileXIcon,
  FolderPenIcon,
  FolderPlusIcon,
  FolderXIcon,
  FlagOffIcon,
  GavelIcon,
  HashIcon,
  ListIcon,
  LogOutIcon,
  MegaphoneIcon,
  MegaphoneOffIcon,
  PanelRightOpenIcon,
  PencilIcon,
  ServerIcon,
  ShieldCogIcon,
  StickyNoteIcon,
  TagIcon,
  TagPlusIcon,
  TagXIcon,
  ToggleRightIcon,
  Trash2Icon,
  UnlinkIcon,
  UserLockIcon,
  UserPenIcon,
  UserRoundMinusIcon,
  UserRoundPlusIcon,
  UserXIcon,
  ZapIcon,
  ImageIcon,
  SendIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { codeColumn, type DataTableColumn, dateColumn, lookColumn, statusColumn, textColumn, type Tone, userColumn } from "@/components/admin/data-table";
import { DetailFieldButton } from "@/components/admin/detail";
import { createVersion } from "@/lib/admin/version";
import type { OpenUser } from "../users/use-user-panel";
import type { AuditRow } from "./audit-row";

/*
 * How an entry of the logs is drawn, shared by its table and its detail.
 */

/** The version of the logs: the `refreshKey` of their table and of their detail. */
export const { useVersion: useAuditVersion, bump: bumpAudit } = createVersion();

export const DOMAINS: Record<string, string> = {
  users: "Utilisateurs",
  reports: "Signalements",
  usernames: "Pseudos réservés",
  roles: "Rôles",
  badges: "Badges",
  userTags: "Tags",
  system: "Système",
};

type Outcome = "succeeded" | "failed";

export const OUTCOMES: Record<Outcome, { label: string; tone: Tone }> = {
  succeeded: { label: "Réussie", tone: "green" },
  failed: { label: "Échec", tone: "red" },
};

/** One icon per action, by its key. */
const ACTION_ICONS: Record<string, ReactNode> = {
  "users.suspend": <BanIcon />,
  "users.unsuspend": <CircleCheckIcon />,
  "users.delete": <UserXIcon />,
  "users.moderate": <GavelIcon />,
  "users.strava.unlink": <UnlinkIcon />,
  "users.sessions.revoke": <LogOutIcon />,
  "users.userTags.grant": <TagPlusIcon />,
  "users.userTags.revoke": <TagXIcon />,
  "reports.sanction": <GavelIcon />,
  "reports.dismiss": <FlagOffIcon />,
  "usernames.reserve": <AtSignIcon />,
  "usernames.release": <DoorOpenIcon />,
  "roles.grant": <UserRoundPlusIcon />,
  "roles.revoke": <UserRoundMinusIcon />,
  "roles.bootstrap": <CrownIcon />,
  "roles.permissions": <ShieldCogIcon />,
  "badges.create": <BadgePlusIcon />,
  "badges.update": <PencilIcon />,
  "badges.active": <ToggleRightIcon />,
  "badges.delete": <BadgeMinusIcon />,
  "badges.reorder": <ArrowUpDownIcon />,
  "badges.themes.create": <FolderPlusIcon />,
  "badges.themes.update": <FolderPenIcon />,
  "badges.themes.delete": <FolderXIcon />,
  "badges.themes.reorder": <ArrowUpDownIcon />,
  "userTags.create": <TagIcon />,
  "userTags.update": <PencilIcon />,
  "userTags.delete": <Trash2Icon />,
  "userTags.reorder": <ArrowUpDownIcon />,
  "releaseNotes.create": <FilePlusIcon />,
  "releaseNotes.update": <FilePenIcon />,
  "releaseNotes.status": <SendIcon />,
  "releaseNotes.delete": <FileXIcon />,
  "releaseNotes.active": <EyeOffIcon />,
  "releaseNotes.banner": <ImageIcon />,
  "system.maintenance.set": <MegaphoneIcon />,
  "system.maintenance.clear": <MegaphoneOffIcon />,
  "system.signups": <UserLockIcon />,
  "system.uploads.orphans.delete": <FileXIcon />,
};

export const actionIcon = (entry: AuditRow) => ACTION_ICONS[entry.action] ?? <ZapIcon />;

/** Opens a user of the entry in the side panel, while the account exists. */
function userTool(user: AuditUser | null, openUser: OpenUser) {
  const { username } = user ?? {};
  if (!user || !username) return null;
  return (
    <DetailFieldButton label={`Ouvrir @${username}`} onClick={() => openUser({ id: user.id, username })}>
      <PanelRightOpenIcon aria-hidden />
    </DetailFieldButton>
  );
}

/** The columns of the logs, their users opened in the side panel by `openUser`. */
export function auditColumns(openUser: OpenUser): DataTableColumn<AuditRow>[] {
  return [
    dateColumn({ id: "createdAt", header: "Date", icon: <CalendarClockIcon />, sortable: true, locked: true, time: true, value: (entry) => entry.createdAt }),
    userColumn({ id: "actor", header: "Auteur", icon: <UserPenIcon />, locked: false, value: (entry) => entry.actor, empty: "Système", tools: (entry) => userTool(entry.actor, openUser) }),
    userColumn({ id: "target", header: "Cible", icon: <ArrowRightIcon />, locked: false, value: (entry) => entry.targetUser, tools: (entry) => userTool(entry.targetUser, openUser) }),
    lookColumn({ id: "action", header: "Action", icon: <ZapIcon />, sortable: true, locked: false, value: (entry) => ({ icon: actionIcon(entry), name: entry.label }) }),
    statusColumn({ id: "outcome", header: "Résultat", icon: <CircleDotIcon />, value: (entry) => (entry.succeeded ? "succeeded" : "failed"), statuses: OUTCOMES }),
    textColumn({ id: "reason", header: "Raison", icon: <StickyNoteIcon />, value: (entry) => entry.reason, muted: true, width: "max-w-72" }),
    textColumn({ id: "details", header: "Détails", icon: <ListIcon />, value: (entry) => entry.lines.join(" · ") || null, width: "max-w-72" }),
    codeColumn({ id: "id", header: "ID", icon: <HashIcon />, value: (entry) => entry.id, width: "max-w-20" }),
    codeColumn({ id: "status", header: "Code HTTP", icon: <ServerIcon />, value: (entry) => (entry.status === null ? null : String(entry.status)) }),
  ];
}
