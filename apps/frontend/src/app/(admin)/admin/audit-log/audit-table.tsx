"use client";

import type { AuditUser } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import {
  ArrowRightIcon,
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
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { PanelLink } from "@/components/admin/panel-link";
import {
  type DataTableConfig,
  DataTable,
  dateColumn,
  formatDateTime,
  RowActions,
  statusColumn,
  textColumn,
  type Tone,
  userColumn,
} from "@/components/admin/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user/user-avatar";
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
export function AuditTable({ scope, superAdmin, usersPath }: { scope: AuditScope; superAdmin: boolean; usersPath: string }) {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [open, setOpen] = useState<{ open: boolean; entry: AuditRow | null }>({ open: false, entry: null });
  // Each change gives a new source, fetched again.
  const [version, setVersion] = useState(0);

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
        { id: "table", label: "Table" },
        { id: "list", label: "Liste", layout: "list", columns: ["createdAt", "actor", "action"], noActions: true },
      ],
      columns: [
        dateColumn({ id: "createdAt", header: "Date", icon: <CalendarClockIcon />, sortable: true, locked: true, time: true, value: (entry) => entry.createdAt }),
        userColumn({ id: "actor", header: "Auteur", icon: <UserPenIcon />, locked: false, value: (entry) => entry.actor, empty: "Système" }),
        userColumn({ id: "target", header: "Cible", icon: <ArrowRightIcon />, locked: false, value: (entry) => entry.targetUser }),
        textColumn({ id: "action", header: "Action", icon: <ZapIcon />, sortable: true, value: (entry) => entry.label, width: "max-w-56" }),
        statusColumn({ id: "outcome", header: "Résultat", icon: <CircleDotIcon />, value: (entry) => (entry.succeeded ? "succeeded" : "failed"), statuses: OUTCOMES }),
        textColumn({ id: "reason", header: "Raison", icon: <StickyNoteIcon />, value: (entry) => entry.reason, muted: true, width: "max-w-72" }),
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
          {/* A link inside, e.g. to a user, closes the dialog on its way. */}
          <div onClick={(event) => event.target instanceof Element && event.target.closest("a") && setOpen({ ...open, open: false })}>
            {open.entry && <EntryDetails entry={open.entry} usersPath={usersPath} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Everything about an entry, in its dialog. */
function EntryDetails({ entry, usersPath }: { entry: AuditRow; usersPath: string }) {
  const status = entry.status ?? "—";
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
      <Item label="Date">{formatDateTime(entry.createdAt)}</Item>
      <Item label="Auteur">
        <UserLink user={entry.actor} fallback="Système" usersPath={usersPath} />
      </Item>
      <Item label="Cible">
        {entry.targetUser ? (
          <UserLink user={entry.targetUser} fallback="—" usersPath={usersPath} />
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

/** A user of the entry, opening their panel while the account exists. */
function UserLink({ user, fallback, usersPath }: { user: AuditUser | null; fallback: string; usersPath: string }) {
  if (!user) return <span className="text-muted-foreground">{fallback}</span>;
  if (!user.username) return <span className="text-muted-foreground italic">Compte supprimé</span>;
  return (
    <PanelLink
      href={`${usersPath}/${user.id}`}
      panelPrefix={`${usersPath}/`}
      className="inline-flex items-center gap-1.5 font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
    >
      <UserAvatar user={{ ...user, username: user.username }} className="size-5" fallbackClassName="text-[9px]" />
      {user.displayName ?? `@${user.username}`}
    </PanelLink>
  );
}
