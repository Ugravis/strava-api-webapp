"use client";

import { highestAdminRole } from "@kilotrace/shared/admin";
import {
  ActivityIcon,
  AtSignIcon,
  BanIcon,
  CalendarPlusIcon,
  CircleCheckIcon,
  CircleDotIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  EraserIcon,
  EyeIcon,
  FileImageIcon,
  HardDriveIcon,
  HashIcon,
  HistoryIcon,
  LinkIcon,
  MailIcon,
  PanelRightOpenIcon,
  ShapesIcon,
  StickyNoteIcon,
  TagIcon,
  TypeIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  buttonsColumn,
  bytesColumn,
  CellButton,
  CellButtons,
  codeColumn,
  customColumn,
  type DataTableConfig,
  dateColumn,
  EmptyValue,
  iconsColumn,
  localTableSource,
  numberColumn,
  pillsColumn,
  RowActions,
  statusColumn,
  textColumn,
  Truncate,
  userColumn,
} from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { type PocActionKind, POC_NOW, POC_USERS, type PocUser } from "./poc-data";
import { CONNECTIONS, categoryPills, connectionItems, connectionsOf, ROLES, STATUSES, tagItems, UserMarks } from "./poc-marks";

const open = (user: PocUser) => toast(`Ouvrirait le panneau de @${user.username}`);

/** The demo rows, served like the API would, after a network-like pause. */
export const fetchPocUsers = localTableSource(POC_USERS, {
  search: (user) => `${user.displayName ?? ""} ${user.username} ${user.email}`,
  sorts: {
    user: (user) => user.username,
    displayName: (user) => user.displayName,
    status: (user) => user.status,
    createdAt: (user) => user.createdAt,
    lastSeenAt: (user) => user.lastSeenAt,
    activities: (user) => user.activitiesCount,
    storage: (user) => user.storageBytes,
    userTags: (user) => user.userTags.length,
  },
  facets: {
    status: { options: Object.keys(STATUSES), values: (user) => [user.status] },
    connections: { options: Object.keys(CONNECTIONS), values: connectionsOf },
  },
  groupings: {
    status: (user) => user.status,
    role: (user) => highestAdminRole(user.roles) ?? "~",
  },
  delay: () => 300 + Math.random() * 400,
});

/** Every kind of field of the back office, on fake accounts. */
export const USERS: DataTableConfig<PocUser> = {
  id: "users",
  fetch: fetchPocUsers,
  rowId: (user) => user.id,
  onOpen: open,
  search: "Nom, @username ou e-mail",
  noun: (count) => (count > 1 ? "comptes" : "compte"),
  empty: { title: "Aucun compte", description: "Les comptes apparaîtront ici dès la première inscription." },
  create: { label: "Nouveau", onClick: () => toast("Ouvrirait la création d'un compte") },
  views: [
    { id: "table", label: "Tableau" },
    { id: "overview", label: "Aperçu", columns: ["user", "status", "lastSeenAt", "connections"] },
    { id: "cards", label: "Cartes", layout: "cards", columns: ["user", "status", "email", "createdAt", "lastSeenAt", "activities", "connections", "userTags"] },
    { id: "list", label: "Liste", layout: "list", columns: ["user", "status", "lastSeenAt"] },
    { id: "actions", label: "Dernières actions", layout: "list", columns: ["lastAction"], noSelection: true, noActions: true },
  ],
  columns: [
    userColumn({ id: "user", header: "Utilisateur", icon: <AtSignIcon />, sortable: true, value: (user) => user, marks: (user) => <UserMarks user={user} /> }),
    textColumn({ id: "displayName", header: "Nom affiché", icon: <TypeIcon />, sortable: true, value: (user) => user.displayName, width: "max-w-44" }),
    statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: (user) => user.status, statuses: STATUSES }),
    textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, value: (user) => user.email, muted: true, width: "max-w-52" }),
    dateColumn({ id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortable: true, value: (user) => user.createdAt }),
    dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (user) => user.lastSeenAt, relative: true, now: POC_NOW }),
    numberColumn({ id: "activities", header: "Activités", icon: <ActivityIcon />, sortable: true, value: (user) => user.activitiesCount }),
    bytesColumn({ id: "storage", header: "Stockage", icon: <HardDriveIcon />, sortable: true, value: (user) => user.storageBytes }),
    iconsColumn({ id: "connections", header: "Connexions", icon: <LinkIcon />, value: connectionItems }),
    iconsColumn({ id: "userTags", header: "Tags", icon: <TagIcon />, sortable: true, value: tagItems }),
    customColumn({
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
          <EmptyValue />
        ),
    }),
    buttonsColumn({
      id: "quick",
      header: "Actions",
      icon: <ZapIcon />,
      count: 3,
      buttons: (user) => (
        <CellButtons>
          <CellButton text label="Voir" icon={<EyeIcon />} onClick={() => open(user)} />
          <CellButton label="Envoyer un e-mail" icon={<MailIcon />} onClick={() => toast(`Écrirait à ${user.email}`)} />
          {user.status === "suspended" ? (
            <CellButton label="Réactiver" icon={<CircleCheckIcon />} onClick={() => toast(`Réactiverait @${user.username}`)} />
          ) : (
            <CellButton destructive label="Suspendre" icon={<BanIcon />} onClick={() => toast(`Ouvrirait la suspension de @${user.username}`)} />
          )}
        </CellButtons>
      ),
    }),
    pillsColumn({ id: "categories", header: "Catégorie", icon: <ShapesIcon />, value: categoryPills }),
    textColumn({ id: "note", header: "Note", icon: <StickyNoteIcon />, value: (user) => user.note }),
    codeColumn({ id: "avatarKey", header: "Fichier avatar", icon: <FileImageIcon />, value: (user) => user.avatarKey }),
    codeColumn({ id: "id", header: "ID", icon: <HashIcon />, value: (user) => user.id, width: "max-w-20" }),
  ],
  facets: [
    { id: "status", label: "Statut", options: Object.entries(STATUSES).map(([value, { label }]) => ({ value, label })) },
    { id: "connections", label: "Connexion", options: Object.entries(CONNECTIONS).map(([value, { label, icon }]) => ({ value, label, icon })) },
  ],
  groupings: [
    { id: "status", label: "Statut", title: (key) => STATUSES[key as PocUser["status"]].label },
    { id: "role", label: "Rôle", title: (key) => (key === "~" ? "Sans rôle" : ROLES[key]!.label) },
  ],
  bulkActions: () => (
    <>
      <Button size="sm" variant="ghost" onClick={() => toast("Exporterait la sélection")}>
        <DownloadIcon data-icon="inline-start" />
        Exporter
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => toast("Suspendrait la sélection")}>
        <BanIcon data-icon="inline-start" />
        Suspendre
      </Button>
    </>
  ),
  actions: (user) => (
    <RowActions label={`Actions de @${user.username}`}>
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
    </RowActions>
  ),
};

const ACTION_ICONS = { suspend: BanIcon, reset: EraserIcon, tag: TagIcon, unsuspend: CircleCheckIcon };

function ActionIcon({ kind }: { kind: PocActionKind }) {
  const Icon = ACTION_ICONS[kind];
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}
