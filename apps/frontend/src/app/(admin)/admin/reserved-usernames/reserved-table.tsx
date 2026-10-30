"use client";

import {
  type AdminReservedUsername,
  RESERVED_USERNAME_CATEGORIES,
  RESERVED_USERNAME_NOTE_MAX_LENGTH,
  type ReservedUsernameCategory,
} from "@kilotrace/shared/admin";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@kilotrace/shared";
import type { TableQuery } from "@kilotrace/shared/table";
import { AtSignIcon, CalendarPlusIcon, CopyIcon, PencilIcon, ShapesIcon, StickyNoteIcon, Trash2Icon, UserPenIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import {
  customColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  pillsColumn,
  RowActions,
  textColumn,
  type Tone,
  UserCell,
} from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchReservedTable, releaseUsername, releaseUsernames, reserveUsername, updateReservedUsername } from "./actions";

const ID = "reserved";

const CATEGORIES: Record<ReservedUsernameCategory, { label: string; tone: Tone }> = {
  system: { label: "Système", tone: "gray" },
  personality: { label: "Personnalité", tone: "violet" },
  brand: { label: "Marque", tone: "blue" },
  offensive: { label: "Injurieux", tone: "red" },
  other: { label: "Autre", tone: "amber" },
};

/** Keys of the grouping by author, as the backend sends them. */
const INITIAL_LIST = "";
const DELETED_AUTHOR = "~";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

function Author({ entry }: { entry: AdminReservedUsername }) {
  if (!entry.createdBy) return <span className="text-muted-foreground">Liste initiale</span>;
  if (!entry.createdBy.username) return <span className="text-muted-foreground italic">Compte supprimé</span>;
  return <UserCell user={{ ...entry.createdBy, username: entry.createdBy.username }} />;
}

const noteField = (defaultValue?: string) =>
  ({ kind: "textarea", name: "note", label: "Note (optionnelle)", hint: "Visible par l'équipe seulement.", maxLength: RESERVED_USERNAME_NOTE_MAX_LENGTH, defaultValue }) as const;

const categoryField = (defaultValue: ReservedUsernameCategory) =>
  ({
    kind: "select",
    name: "category",
    label: "Catégorie",
    defaultValue,
    options: RESERVED_USERNAME_CATEGORIES.map((value) => ({ value, label: CATEGORIES[value].label })),
  }) as const;

/** Usernames nobody can take. Every member reads, `canEdit` adds, edits and deletes. */
export function ReservedTable({ canEdit }: { canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; entry: AdminReservedUsername | null }>({ open: false, entry: null });
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [releasing, setReleasing] = useState({ open: false, username: "" });
  const [bulk, setBulk] = useState({ open: false, usernames: [] as string[], clear: () => {} });
  // Each change gives a new source, fetched again.
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((each) => each + 1);

  const config = useMemo<DataTableConfig<AdminReservedUsername>>(
    () => ({
      id: ID,
      fetch: (query: TableQuery) => fetchReservedTable(query),
      rowId: (entry) => entry.username,
      search: "Pseudo ou note",
      noun: (total) => (total > 1 ? "pseudos" : "pseudo"),
      empty: { title: "Aucun pseudo désactivé", description: "Les pseudos réservés par l'équipe apparaîtront ici." },
      defaultSort: { id: "createdAt", desc: true },
      defaultGroupBy: "category",
      views: [
        { id: "list", label: "Liste", layout: "list", columns: ["username"], noSelection: true },
        { id: "table", label: "Table", columns: ["username", "category", "createdBy", "createdAt", "note"] },
      ],
      columns: [
        textColumn({ id: "username", header: "Pseudo", icon: <AtSignIcon />, sortable: true, locked: true, value: (entry) => `@${entry.username}` }),
        pillsColumn({ id: "category", header: "Catégorie", icon: <ShapesIcon />, sortable: true, value: (entry) => [CATEGORIES[entry.category]] }),
        customColumn({
          id: "createdBy",
          header: "Ajouté par",
          icon: <UserPenIcon />,
          sortable: true,
          cell: (entry) => <Author entry={entry} />,
          copy: (entry) => entry.createdBy?.username ?? null,
          skeleton: (
            <span className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </span>
          ),
        }),
        dateColumn({ id: "createdAt", header: "Date", icon: <CalendarPlusIcon />, sortable: true, value: (entry) => entry.createdAt }),
        textColumn({ id: "note", header: "Note", icon: <StickyNoteIcon />, sortable: true, value: (entry) => entry.note, muted: true, width: "max-w-64" }),
      ],
      facets: [{ id: "category", label: "Catégorie", options: Object.entries(CATEGORIES).map(([value, { label }]) => ({ value, label })) }],
      groupings: [
        { id: "category", label: "Catégorie", title: (key) => CATEGORIES[key as ReservedUsernameCategory]?.label ?? key },
        {
          id: "createdBy",
          label: "Ajouté par",
          title: (key) => (key === INITIAL_LIST ? "Liste initiale" : key === DELETED_AUTHOR ? "Compte supprimé" : `@${key}`),
        },
      ],
      ...(canEdit && {
        create: { label: "Nouveau", onClick: () => setAdding(true) },
        bulkActions: (usernames: string[], clear: () => void) => (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setBulk({ open: true, usernames, clear })}>
            <Trash2Icon data-icon="inline-start" />
            Supprimer
          </Button>
        ),
      }),
      actions: (entry) => (
        <RowActions label={`Actions de @${entry.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(entry.username, "Pseudo copié")}>
              <CopyIcon />
              Copier le pseudo
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {canEdit && (
            <>
              <DropdownMenuItem onClick={() => setEditing({ open: true, entry })}>
                <PencilIcon />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setReleasing({ open: true, username: entry.username })}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    // `version` gives a new source, fetched again, after each change.
    [canEdit, version],
  );

  return (
    <>
      <DataTable config={config} />
      {canEdit && (
        <>
          <FormDialog
            open={adding}
            onOpenChange={setAdding}
            onSuccess={changed}
            action={reserveUsername}
            title="Réserver un pseudo"
            description="Personne ne pourra plus le prendre. Un pseudo déjà porté par un compte ne peut pas être réservé : modérez d'abord le profil."
            submitLabel="Réserver"
            cancelLabel="Annuler"
            fields={[
              {
                kind: "text",
                name: "username",
                label: "Pseudo",
                hint: `${USERNAME_MIN_LENGTH} à ${USERNAME_MAX_LENGTH} caractères : lettres, chiffres et _. Mis en minuscules.`,
                required: true,
                maxLength: USERNAME_MAX_LENGTH,
                pattern: `[a-zA-Z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}`,
              },
              categoryField("other"),
              noteField(),
            ]}
          />
          <FormDialog
            open={editing.open}
            onOpenChange={(value) => setEditing({ ...editing, open: value })}
            onSuccess={changed}
            action={updateReservedUsername.bind(null, editing.entry?.username ?? "")}
            title={`Modifier @${editing.entry?.username ?? ""}`}
            description="Le pseudo reste désactivé ; seules sa catégorie et sa note changent."
            submitLabel="Enregistrer"
            cancelLabel="Annuler"
            fields={[categoryField(editing.entry?.category ?? "other"), noteField(editing.entry?.note ?? "")]}
          />
          <ActionDialog
            open={releasing.open}
            onOpenChange={(value) => setReleasing({ ...releasing, open: value })}
            onSuccess={changed}
            action={releaseUsername.bind(null, releasing.username)}
            title={`Supprimer @${releasing.username} ?`}
            description="Le pseudo redeviendra disponible pour tout le monde."
            submitLabel="Supprimer"
            cancelLabel="Annuler"
            destructive
          />
          <ActionDialog
            open={bulk.open}
            onOpenChange={(value) => setBulk({ ...bulk, open: value })}
            onSuccess={() => {
              bulk.clear();
              changed();
            }}
            action={releaseUsernames.bind(null, bulk.usernames)}
            title={bulk.usernames.length > 1 ? `Supprimer ${bulk.usernames.length} pseudos ?` : `Supprimer @${bulk.usernames[0]} ?`}
            description="Ils redeviendront disponibles pour tout le monde."
            submitLabel="Supprimer"
            cancelLabel="Annuler"
            destructive
          />
        </>
      )}
    </>
  );
}
