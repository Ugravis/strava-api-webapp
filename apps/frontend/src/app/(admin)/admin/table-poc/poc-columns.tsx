"use client";

import { highestAdminRole } from "@kilotrace/shared/admin";
import {
  ActivityIcon,
  AtSignIcon,
  BanIcon,
  CircleCheckIcon,
  EraserIcon,
  ShapesIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  ClockIcon,
  CopyIcon,
  FileImageIcon,
  HardDriveIcon,
  HashIcon,
  HistoryIcon,
  LayoutGridIcon,
  LinkIcon,
  MailIcon,
  MoreHorizontalIcon,
  PanelRightOpenIcon,
  StickyNoteIcon,
  TableIcon,
  TableOfContentsIcon,
  TagIcon,
  TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { publicNameOf } from "@/lib/user";
import {
  CategoryPills,
  CONNECTIONS,
  ConnectionIcons,
  connectionsOf,
  Empty,
  formatBytes,
  formatDate,
  formatNumber,
  ROLE_LABELS,
  RoleBadge,
  STATUS_LABELS,
  StatusDot,
  SuspendedMark,
  Truncate,
  UserCell,
  UserTagIcons,
  When,
} from "./poc-bits";
import { type PocActionKind, POC_USERS, type PocUser } from "./poc-data";
import type { PocTableConfig } from "./poc-table";

/** Shown only on hover where a pointer hovers, always on touch screens. */
const ON_HOVER = "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100";

const open = (user: PocUser) => toast(`Ouvrirait le panneau de @${user.username}`);

/** Every kind of field of the back office, on fake accounts. */
export const USERS: PocTableConfig<PocUser> = {
  rows: POC_USERS,
  rowId: (user) => user.id,
  selectable: true,
  onOpen: open,
  search: { label: "Nom, @username ou e-mail", text: (user) => `${user.displayName ?? ""} ${user.username} ${user.email}` },
  noun: (count) => (count > 1 ? "comptes" : "compte"),
  empty: { title: "Aucun compte", description: "Les comptes apparaîtront ici dès la première inscription." },
  create: { label: "Nouveau", onClick: () => toast("Ouvrirait la création d'un compte") },
  views: [
    { id: "table", label: "Tableau", icon: <TableIcon /> },
    { id: "overview", label: "Aperçu", icon: <TableOfContentsIcon />, columns: ["user", "status", "lastSeenAt", "connections"] },
    { id: "cards", label: "Cartes", icon: <LayoutGridIcon />, cards: true },
  ],
  columns: [
    {
      id: "user",
      header: "Utilisateur",
      icon: <AtSignIcon />,
      locked: true,
      sortValue: (user) => user.username,
      copy: (user) => user.username,
      cell: (user) => <UserCell user={user} />,
      skeleton: (
        <span className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </span>
      ),
    },
    { id: "displayName", header: "Nom affiché", icon: <TypeIcon />, copy: (user) => user.displayName, sortValue: (user) => user.displayName ?? "", cell: (user) => (user.displayName ? <Truncate className="max-w-44">{user.displayName}</Truncate> : <Empty />) },
    { id: "status", header: "Statut", icon: <CircleDotIcon />, sortValue: (user) => user.status, cell: (user) => <StatusDot status={user.status} /> },
    { id: "email", header: "E-mail", icon: <MailIcon />, copy: (user) => user.email, cell: (user) => <Truncate className="max-w-52 text-muted-foreground">{user.email}</Truncate> },
    { id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortValue: (user) => user.createdAt, cell: (user) => <span className="text-muted-foreground">{formatDate(user.createdAt)}</span> },
    { id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortValue: (user) => user.lastSeenAt ?? "", cell: (user) => <When iso={user.lastSeenAt} /> },
    { id: "activities", header: "Activités", icon: <ActivityIcon />, copy: (user) => (user.activitiesCount ? String(user.activitiesCount) : null), sortValue: (user) => user.activitiesCount, cell: (user) => (user.activitiesCount ? <span className="tabular-nums">{formatNumber(user.activitiesCount)}</span> : <Empty />) },
    { id: "storage", header: "Stockage", icon: <HardDriveIcon />, copy: (user) => (user.storageBytes ? formatBytes(user.storageBytes) : null), sortValue: (user) => user.storageBytes, cell: (user) => (user.storageBytes ? <span className="tabular-nums">{formatBytes(user.storageBytes)}</span> : <Empty />) },
    { id: "connections", header: "Connexions", icon: <LinkIcon />, cell: (user) => <ConnectionIcons user={user} /> },
    { id: "userTags", header: "Tags", icon: <TagIcon />, sortValue: (user) => user.userTags.length, cell: (user) => <UserTagIcons tags={user.userTags} /> },
    {
      id: "lastAction",
      header: "Dernière action",
      icon: <HistoryIcon />,
      cell: ({ lastAction }) =>
        lastAction ? (
          <span className="flex max-w-64 items-center gap-1.5">
            <ActionIcon kind={lastAction.kind} />
            <Truncate>{lastAction.label}</Truncate>
            {lastAction.failedStatus && <Badge variant="destructive">Échec {lastAction.failedStatus}</Badge>}
          </span>
        ) : (
          <Empty />
        ),
    },
    { id: "categories", header: "Catégorie", icon: <ShapesIcon />, cell: (user) => <CategoryPills categories={user.categories} /> },
    { id: "note", header: "Note", icon: <StickyNoteIcon />, copy: (user) => user.note, cell: (user) => (user.note ? <Truncate className="max-w-56">{user.note}</Truncate> : <Empty />) },
    { id: "avatarKey", header: "Fichier avatar", icon: <FileImageIcon />, copy: (user) => user.avatarKey, cell: (user) => (user.avatarKey ? <Truncate className="max-w-44 font-mono text-xs">{user.avatarKey}</Truncate> : <Empty />) },
    { id: "id", header: "ID", icon: <HashIcon />, copy: (user) => user.id, cell: (user) => <Truncate className="max-w-20 font-mono text-xs text-muted-foreground">{user.id}</Truncate> },
  ],
  facets: [
    {
      id: "status",
      label: "Statut",
      options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      values: (user) => [user.status],
    },
    {
      id: "connections",
      label: "Connexion",
      options: Object.entries(CONNECTIONS).map(([value, { label, icon }]) => ({ value, label, icon })),
      values: connectionsOf,
    },
  ],
  groupings: [
    { id: "status", label: "Statut", key: (user) => user.status, title: (key) => STATUS_LABELS[key as PocUser["status"]] },
    {
      id: "role",
      label: "Rôle",
      key: (user) => highestAdminRole(user.roles) ?? "~",
      title: (key) => (key === "~" ? "Sans rôle" : ROLE_LABELS[key as keyof typeof ROLE_LABELS]),
    },
  ],
  card: (user) => (
    <button
      type="button"
      onClick={() => open(user)}
      className="flex w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <UserAvatar user={user} className="size-9" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <Truncate className="text-sm font-medium">{publicNameOf(user)}</Truncate>
          <RoleBadge roles={user.roles} />
          {user.status === "suspended" && <SuspendedMark />}
          <span className="ml-auto shrink-0 pl-1">
            <ConnectionIcons user={user} />
          </span>
        </span>
        <span className="truncate text-xs text-muted-foreground">
          @{user.username} • {formatDate(user.createdAt)}
        </span>
      </span>
    </button>
  ),
  actions: (user) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" className={ON_HOVER} aria-label={`Actions de @${user.username}`} />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => open(user)}>
            <PanelRightOpenIcon />
            Ouvrir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast("ID copié")}>
            <CopyIcon />
            Copier l&apos;ID
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => toast("Ouvrirait la suspension")}>
          <BanIcon />
          Suspendre
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

const ACTION_ICONS = { suspend: BanIcon, reset: EraserIcon, tag: TagIcon, unsuspend: CircleCheckIcon };

function ActionIcon({ kind }: { kind: PocActionKind }) {
  const Icon = ACTION_ICONS[kind];
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}
