"use client";

import type { AdminReservedUsername, ReservedUsernameCategory } from "@kilotrace/shared/admin";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@kilotrace/shared";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, PanelRightOpenIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import { type DataTableConfig, DataTable, RowActions } from "@/components/admin/data-table";
import { useSplitPanel } from "@/components/split-panel";
import { Button } from "@/components/ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchReservedTable, loadReservedUsername, releaseUsernames, reserveUsername } from "./actions";
import { bumpReserved, CATEGORIES, categoryField, noteField, RESERVED_COLUMNS, useReservedDialogs, useReservedVersion } from "./reserved-bits";
import { ReservedRowPanel } from "./reserved-detail";

const ID = "reserved";

/** Keys of the grouping by author, as the backend sends them. */
const INITIAL_LIST = "";
const DELETED_AUTHOR = "~";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** Usernames nobody can take. Every member reads, `canEdit` adds, edits and deletes. */
export function ReservedTable({ canEdit }: { canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState({ open: false, usernames: [] as string[], clear: () => {} });
  const version = useReservedVersion();
  const { openEdit, openRelease, dialogs } = useReservedDialogs();
  const { open, close, isOpen, activeId } = useSplitPanel();
  const openEntry = useCallback(
    // Opened at once on its skeleton, the username loaded by the panel.
    (entry: { username: string }) => open(<ReservedRowPanel username={entry.username} canEdit={canEdit} />, { id: entry.username, title: `@${entry.username}` }),
    [open, canEdit],
  );
  // A shared link: the username of `?row=`, once on arrival, fetched by id.
  useEffect(() => {
    const username = new URLSearchParams(window.location.search).get("row");
    if (username) loadReservedUsername(username).then((entry) => entry && openEntry(entry), () => {});
  }, [openEntry]);

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
      columns: RESERVED_COLUMNS,
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
            <DropdownMenuItem onClick={() => openEntry(entry)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(entry.username, "Pseudo copié")}>
              <CopyIcon />
              Copier le pseudo
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {canEdit && (
            <>
              <DropdownMenuItem onClick={() => openEdit(entry)}>
                <PencilIcon />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => openRelease(entry.username)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    [canEdit, openEntry, openEdit, openRelease],
  );

  return (
    <>
      <DataTable config={config} onRowClick={openEntry} activeRowId={isOpen ? activeId : null} refreshKey={version} />
      {canEdit && (
        <>
          <FormDialog
            open={adding}
            onOpenChange={setAdding}
            onSuccess={bumpReserved}
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
          {dialogs}
          <ActionDialog
            open={bulk.open}
            onOpenChange={(value) => setBulk({ ...bulk, open: value })}
            onSuccess={() => {
              bulk.clear();
              // A released username open in the panel closes it.
              if (activeId && bulk.usernames.includes(activeId)) close();
              bumpReserved();
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
