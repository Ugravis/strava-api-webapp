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
  ExternalLinkIcon,
  EyeIcon,
  FileImageIcon,
  HardDriveIcon,
  HashIcon,
  HistoryIcon,
  ImageIcon,
  KeyRoundIcon,
  LinkIcon,
  MailIcon,
  PanelRightOpenIcon,
  ShapesIcon,
  StickyNoteIcon,
  TagIcon,
  Trash2Icon,
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
  imageColumn,
  localTableSource,
  numberColumn,
  pillsColumn,
  RowActions,
  SelectionAction,
  statusColumn,
  textColumn,
  Truncate,
  userColumn,
} from "@kilotrace/ui/components/admin/data-table";
import { Badge } from "@kilotrace/ui/components/ui/badge";
import { Button } from "@kilotrace/ui/components/ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { type PocActionKind, POC_NOW, POC_USERS, type PocUser } from "./poc-data";
import { BulkEditAction, fromRule } from "@kilotrace/ui/components/admin/detail";
import { USER_RULES } from "./poc-rules";
import { bulkEditPocUsers, removePocUsers, savePocUser, suspendPocUsers } from "./poc-store";
import { CATEGORY_OPTIONS, CONNECTIONS, categoryPills, connectionItems, connectionsOf, ROLES, STATUSES, tagItems, UserMarks } from "./poc-marks";

const open = (user: PocUser) => toast(`Ouvrirait le panneau de @${user.username}`);

/** Offered as the keywords of an account are typed. */
const USER_KEYWORDS = ["signalé", "à suivre", "VIP", "partenaire", "bêta"];

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
    { id: "cards", label: "Cartes", layout: "cards", columns: ["user", "cover", "status", "email", "createdAt", "lastSeenAt", "activities", "connections", "userTags"] },
    { id: "list", label: "Liste", layout: "list", columns: ["user", "cover", "status", "lastSeenAt"] },
    { id: "actions", label: "Dernières actions", layout: "list", columns: ["lastAction"], noSelection: true, noActions: true },
  ],
  columns: [
    userColumn({ id: "user", header: "Utilisateur", icon: <AtSignIcon />, sortable: true, value: (user) => user, marks: (user) => <UserMarks user={user} /> }),
    imageColumn({
      id: "cover",
      header: "Couverture",
      icon: <ImageIcon />,
      value: (user) => user.cover,
      // A file of 2 MB at most, saved by « Valider »; removed by « Retirer ».
      edit: (user) => ({
        kind: "image",
        value: user.cover?.src ?? null,
        maxSize: 2 * 1024 * 1024,
        noneLabel: "Retirer",
        onSave: (file) => savePocUser(user.id, { cover: file && { src: URL.createObjectURL(file), alt: `Couverture de @${user.username}` } }),
      }),
    }),
    textColumn({
      id: "displayName",
      header: "Nom affiché",
      icon: <TypeIcon />,
      sortable: true,
      value: (user) => user.displayName,
      width: "max-w-44",
      edit: (user) => ({ kind: "text", value: user.displayName, placeholder: "Nom affiché", onSave: (displayName) => savePocUser(user.id, { displayName: displayName ?? "" }) }),
    }),
    statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: (user) => user.status, statuses: STATUSES }),
    textColumn({
      id: "email",
      header: "E-mail",
      icon: <MailIcon />,
      value: (user) => user.email,
      muted: true,
      width: "max-w-52",
      // An address checked as it is typed (its kind, its shared rule), before any call: the server judges again.
      edit: (user) => ({ kind: "email", ...fromRule(USER_RULES.email), value: user.email, onSave: (email) => savePocUser(user.id, { email: email ?? "" }) }),
    }),
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
      copy: ({ lastAction }) => lastAction?.label ?? null,
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
    pillsColumn({
      id: "categories",
      header: "Catégorie",
      icon: <ShapesIcon />,
      value: categoryPills,
      // Several picked in a list, in the cell as in the detail.
      edit: (user) => ({ kind: "multiselect", value: user.categories, options: CATEGORY_OPTIONS, onSave: (categories) => savePocUser(user.id, { categories: categories as PocUser["categories"] }) }),
    }),
    pillsColumn({
      id: "keywords",
      header: "Mots-clés",
      icon: <KeyRoundIcon />,
      value: (user) => user.keywords.map((label) => ({ label, tone: "gray" as const })),
      // Free values, suggestions offered, in the cell as in the detail.
      edit: (user) => ({ kind: "tags", max: 8, maxLength: 24, value: user.keywords, suggestions: USER_KEYWORDS, onSave: (keywords) => savePocUser(user.id, { keywords }) }),
    }),
    textColumn({
      id: "note",
      header: "Note",
      icon: <StickyNoteIcon />,
      value: (user) => user.note,
      edit: (user) => ({ kind: "text", value: user.note, multiline: true, placeholder: "Une note pour l'équipe", onSave: (note) => savePocUser(user.id, { note }) }),
    }),
    codeColumn({
      id: "stravaId",
      header: "Strava",
      icon: <ExternalLinkIcon />,
      value: (user) => user.stravaId?.toString(),
      href: (user) => (user.stravaId ? `https://www.strava.com/athletes/${user.stravaId}` : null),
      width: "max-w-24",
    }),
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
  // Fields changed on every account picked, then actions asking first.
  bulkActions: (ids, clear) => (
    <>
      <BulkEditAction
        count={ids.length}
        noun={(count) => (count > 1 ? "comptes" : "compte")}
        columns={USERS.columns}
        rules={USER_RULES as never}
        fields={[
          { id: "categories", edit: { kind: "multiselect", options: CATEGORY_OPTIONS } },
          { id: "keywords", edit: { kind: "tags", suggestions: USER_KEYWORDS } },
          { id: "note", edit: { kind: "text", multiline: true, placeholder: "Une note pour l'équipe" } },
        ]}
        onSave={(change) => bulkEditPocUsers(ids, change)}
      />
      <Button size="sm" variant="ghost" onClick={() => toast("Exporterait la sélection")}>
        <DownloadIcon data-icon="inline-start" />
        Exporter
      </Button>
      <SelectionAction
        label="Suspendre"
        icon={<BanIcon data-icon="inline-start" />}
        destructive
        confirm={{
          title: `Suspendre ${ids.length > 1 ? `${ids.length} comptes` : "ce compte"} ?`,
          description: "Ils ne peuvent plus se connecter et n'apparaissent plus sur le site. Les membres de l'équipe sont refusés.",
          confirmLabel: "Suspendre",
          reason: { label: "Motif", placeholder: "Gardé dans l'historique de chaque compte", required: true },
        }}
        onClick={async (reason) => {
          const outcome = await suspendPocUsers(ids, reason);
          if (outcome.ok) clear();
          return outcome;
        }}
      />
      <SelectionAction
        label="Supprimer"
        icon={<Trash2Icon data-icon="inline-start" />}
        destructive
        confirm={{ title: `Supprimer ${ids.length > 1 ? `${ids.length} comptes` : "ce compte"} ?`, description: "Réservé aux super-admins : refusé par le serveur pour un modérateur. Cette suppression est définitive.", confirmLabel: "Supprimer" }}
        onClick={async () => {
          const outcome = await removePocUsers(ids);
          if (outcome.ok) clear();
          return outcome;
        }}
      />
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
