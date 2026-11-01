"use client";

import type { AuditUser } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import {
  ArrowRightIcon,
  ArrowUpDownIcon,
  AtSignIcon,
  BadgeMinusIcon,
  BadgePlusIcon,
  BanIcon,
  CircleCheckIcon,
  CrownIcon,
  DoorOpenIcon,
  EraserIcon,
  FileXIcon,
  FolderPenIcon,
  FolderPlusIcon,
  FolderXIcon,
  HashIcon,
  ListIcon,
  LogOutIcon,
  MegaphoneIcon,
  MegaphoneOffIcon,
  PencilIcon,
  ServerIcon,
  ShieldCogIcon,
  TagIcon,
  TagPlusIcon,
  TagXIcon,
  ToggleRightIcon,
  Trash2Icon,
  UnlinkIcon,
  UserLockIcon,
  UserRoundMinusIcon,
  UserRoundPlusIcon,
  UserXIcon,
  CalendarClockIcon,
  CircleDotIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  PanelRightOpenIcon,
  StickyNoteIcon,
  UserPenIcon,
  ZapIcon,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type DataTableConfig,
  DataTable,
  dateColumn,
  codeColumn,
  formatDateTime,
  lookColumn,
  RowActions,
  statusColumn,
  textColumn,
  type Tone,
  userColumn,
} from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useSplitPanel } from "@/components/split-panel";
import { UserAvatar } from "@/components/user/user-avatar";
import { loadUserDetail } from "../users/actions";
import { UserRowPanel } from "../users/user-detail";
import { type AuditScope, fetchAuditTable, setEntryHidden } from "./actions";
import type { AuditRow } from "./audit-row";

const DOMAINS: Record<string, string> = {
  users: "Utilisateurs",
  usernames: "Pseudos réservés",
  roles: "Rôles",
  badges: "Badges",
  userTags: "Tags",
  system: "Système",
};

type Outcome = "succeeded" | "failed";

const OUTCOMES: Record<Outcome, { label: string; tone: Tone }> = {
  succeeded: { label: "Réussie", tone: "green" },
  failed: { label: "Échec", tone: "red" },
};

/** One icon per action, by its key. */
const ACTION_ICONS: Record<string, ReactNode> = {
  "users.suspend": <BanIcon />,
  "users.unsuspend": <CircleCheckIcon />,
  "users.delete": <UserXIcon />,
  "users.moderate": <EraserIcon />,
  "users.strava.unlink": <UnlinkIcon />,
  "users.sessions.revoke": <LogOutIcon />,
  "users.userTags.grant": <TagPlusIcon />,
  "users.userTags.revoke": <TagXIcon />,
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
  "system.maintenance.set": <MegaphoneIcon />,
  "system.maintenance.clear": <MegaphoneOffIcon />,
  "system.signups": <UserLockIcon />,
  "system.uploads.orphans.delete": <FileXIcon />,
};

const VISIBILITIES = { visible: "Non masquées", hidden: "Masquées" };

/** Keys of the grouping by author, as the backend sends them. */
const SYSTEM = "";
const DELETED = "~";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The logs, append-only: `superAdmin` sees the masked entries and masks or
 * shows one again. A row opens the whole entry; `scope` keeps the entries
 * of one author or one target.
 */
export function AuditTable({ scope, superAdmin }: { scope: AuditScope; superAdmin: boolean }) {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [open, setOpen] = useState<{ open: boolean; entry: AuditRow | null }>({ open: false, entry: null });
  // Each change gives a new source, fetched again.
  const [version, setVersion] = useState(0);
  // A user of an entry opens in the side panel, over the logs.
  const { open: openPanel } = useSplitPanel();
  const openUser = useCallback(
    (user: { id: string; username: string }) => openPanel(<UserRowPanel id={user.id} />, { id: user.id, title: `@${user.username}` }),
    [openPanel],
  );
  // A shared link: the user of `?row=`, once on arrival, fetched by id.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id) loadUserDetail(id).then((data) => data && openUser(data.user), () => {});
  }, [openUser]);

  const config = useMemo<DataTableConfig<AuditRow>>(() => {
    const toggle = async (entry: AuditRow) => {
      const hidden = !entry.hiddenAt;
      const result = await setEntryHidden(entry.id, hidden);
      if (!result.ok) return toast.error(result.message);
      toast.success(hidden ? "Entrée masquée" : "Entrée de nouveau visible");
      setVersion((each) => each + 1);
    };
    return {
      id: "audit",
      fetch: (query: TableQuery) => fetchAuditTable(query, scope),
      rowId: (entry) => entry.id,
      onOpen: (entry) => setOpen({ open: true, entry }),
      muted: (entry) => !!entry.hiddenAt,
      search: "Raison, action ou utilisateur",
      noun: (count) => (count > 1 ? "entrées" : "entrée"),
      empty: { title: "Aucune entrée", description: "Les actions du back office apparaîtront ici." },
      views: [
        { id: "compact", label: "Table compacte", columns: ["createdAt", "actor", "target", "action", "outcome"] },
        { id: "detailed", label: "Table détaillée" },
      ],
      columns: [
        dateColumn({ id: "createdAt", header: "Date", icon: <CalendarClockIcon />, sortable: true, locked: true, time: true, value: (entry) => entry.createdAt }),
        userColumn({ id: "actor", header: "Auteur", icon: <UserPenIcon />, locked: false, value: (entry) => entry.actor, empty: "Système" }),
        userColumn({ id: "target", header: "Cible", icon: <ArrowRightIcon />, locked: false, value: (entry) => entry.targetUser }),
        lookColumn({
          id: "action",
          header: "Action",
          icon: <ZapIcon />,
          sortable: true,
          locked: false,
          value: (entry) => ({ icon: ACTION_ICONS[entry.action] ?? <ZapIcon />, name: entry.label }),
        }),
        statusColumn({ id: "outcome", header: "Résultat", icon: <CircleDotIcon />, value: (entry) => (entry.succeeded ? "succeeded" : "failed"), statuses: OUTCOMES }),
        textColumn({ id: "reason", header: "Raison", icon: <StickyNoteIcon />, value: (entry) => entry.reason, muted: true, width: "max-w-72" }),
        textColumn({ id: "details", header: "Détails", icon: <ListIcon />, value: (entry) => entry.lines.join(" · ") || null, width: "max-w-72" }),
        codeColumn({ id: "id", header: "ID", icon: <HashIcon />, value: (entry) => entry.id, width: "max-w-20" }),
        codeColumn({ id: "status", header: "Code HTTP", icon: <ServerIcon />, value: (entry) => (entry.status === null ? null : String(entry.status)) }),
      ],
      facets: [
        { id: "domain", label: "Domaine", options: Object.entries(DOMAINS).map(([value, label]) => ({ value, label })) },
        { id: "outcome", label: "Résultat", options: Object.entries(OUTCOMES).map(([value, { label }]) => ({ value, label })) },
        ...(superAdmin
          ? [{ id: "visibility", label: "Visibilité", options: Object.entries(VISIBILITIES).map(([value, label]) => ({ value, label })) }]
          : []),
      ],
      groupings: [
        { id: "domain", label: "Domaine", title: (key) => DOMAINS[key] ?? key },
        { id: "actor", label: "Auteur", title: (key) => (key === SYSTEM ? "Système" : key === DELETED ? "Compte supprimé" : `@${key}`) },
      ],
      actions: (entry) => (
        <RowActions label={`Actions de l'entrée du ${formatDateTime(entry.createdAt)}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setOpen({ open: true, entry })}>
              <PanelRightOpenIcon />
              Voir l&apos;entrée
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(entry.id, "ID copié")}>
              <CopyIcon />
              Copier l&apos;ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {superAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggle(entry)}>
                {entry.hiddenAt ? <EyeIcon /> : <EyeOffIcon />}
                {entry.hiddenAt ? "Ne plus masquer" : "Masquer aux autres rôles"}
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    };
    // `version` gives a new source, fetched again, after each change.
  }, [scope, superAdmin, version]);

  return (
    <>
      <DataTable config={config} />
      <Dialog open={open.open} onOpenChange={(value) => setOpen({ ...open, open: value })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Entrée du journal</DialogTitle>
          </DialogHeader>
          {open.entry && (
            <EntryDetails
              entry={open.entry}
              // The dialog closes on its way to the panel.
              onUser={(user) => {
                setOpen({ ...open, open: false });
                openUser(user);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Everything about an entry, in its dialog. */
function EntryDetails({ entry, onUser }: { entry: AuditRow; onUser: (user: { id: string; username: string }) => void }) {
  const status = entry.status ?? "—";
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
      <Item label="Date">{formatDateTime(entry.createdAt)}</Item>
      <Item label="Auteur">
        <UserLink user={entry.actor} fallback="Système" onOpen={onUser} />
      </Item>
      <Item label="Cible">
        {entry.targetUser ? (
          <UserLink user={entry.targetUser} fallback="—" onOpen={onUser} />
        ) : (
          <span className="text-muted-foreground">{entry.targetId ? `${entry.targetType} ${entry.targetId}` : "—"}</span>
        )}
      </Item>
      <Item label="Action">
        {entry.label} <code className="text-xs text-muted-foreground">{entry.action}</code>
      </Item>
      {entry.lines.length > 0 && (
        <Item label="Détails">
          {entry.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </Item>
      )}
      <Item label="Raison">
        <span className="whitespace-pre-line">{entry.reason ?? "—"}</span>
      </Item>
      <Item label="Résultat">{entry.succeeded ? `Réussie (${status})` : <span className="text-destructive">Échouée ({status})</span>}</Item>
      {entry.hiddenAt !== undefined && (
        <Item label="Visibilité">{entry.hiddenAt ? `Masquée le ${formatDateTime(entry.hiddenAt)}` : "Visible de tous les rôles admin"}</Item>
      )}
      <Item label="Id">
        <code className="text-xs break-all">{entry.id}</code>
      </Item>
    </dl>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

/** A user of the entry, opening their detail in the side panel while the account exists. */
function UserLink({ user, fallback, onOpen }: { user: AuditUser | null; fallback: string; onOpen: (user: { id: string; username: string }) => void }) {
  if (!user) return <span className="text-muted-foreground">{fallback}</span>;
  const { username } = user;
  if (!username) return <span className="text-muted-foreground italic">Compte supprimé</span>;
  return (
    <button
      type="button"
      onClick={() => onOpen({ id: user.id, username })}
      className="inline-flex items-center gap-1.5 font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
    >
      <UserAvatar user={{ ...user, username }} className="size-5" fallbackClassName="text-[9px]" />
      {user.displayName ?? `@${username}`}
    </button>
  );
}
