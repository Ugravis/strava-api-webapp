"use client";

import type { AdminReservedUsername, ReservedUsernameCategory } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, CopyPlusIcon, PanelRightOpenIcon, Trash2Icon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, RowActions, SelectionAction, useConfirmDialog } from "@kilotrace/ui/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { fetchReservedTable, loadReservedUsername, releaseUsernames } from "./actions";
import { bumpReserved, CATEGORIES, releaseOf, reservedColumns, useReservedVersion } from "./reserved-bits";
import { ReservedCreate, ReservedRowPanel } from "./reserved-detail";

const ID = "reserved";

/** Keys of the grouping by author, as the backend sends them. */
const INITIAL_LIST = "";
const DELETED_AUTHOR = "~";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** Usernames nobody can take. Every member reads, `canEdit` adds, edits and deletes. */
export function ReservedTable({ canEdit }: { canEdit: boolean }) {
  const version = useReservedVersion();
  const { ask, dialog } = useConfirmDialog();
  // The panel, read by the menus of the rows and the bar of the selection: the config stays the same as it changes.
  const panelRef = useRef<{ controls: RowPanelControls | null; active: string | null }>({ controls: null, active: null });
  /** After a removal: the panel shows the next row, or closes, when it showed one of `usernames`. */
  const removed = (usernames: string[]) => {
    const { controls, active } = panelRef.current;
    if (active && usernames.includes(active)) controls?.removed(active);
  };
  /** After a rename: the panel follows the username, when it showed it. */
  const renamed = (from: string, to: string) => panelRef.current.controls?.renamed(from, to);
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
      // `renamed` reads the ref once a username is saved, never during the render.
      // eslint-disable-next-line react-hooks/refs
      columns: reservedColumns(canEdit, renamed),
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
        bulkActions: (usernames: string[], clear: () => void) => (
          <SelectionAction
            label="Supprimer"
            icon={<Trash2Icon data-icon="inline-start" />}
            destructive
            confirm={{
              title: usernames.length > 1 ? `Supprimer ${usernames.length} pseudos ?` : `Supprimer @${usernames[0]} ?`,
              description: "Ils redeviendront disponibles pour tout le monde.",
              confirmLabel: "Supprimer",
            }}
            onClick={async () => {
              const result = await releaseUsernames(usernames);
              if (result.ok) {
                clear();
                removed(usernames);
              }
              bumpReserved();
              return result;
            }}
          />
        ),
      }),
      actions: (entry) => (
        <RowActions label={`Actions de @${entry.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current.controls?.open(entry.username)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(entry.username, "Pseudo copié")}>
              <CopyIcon />
              Copier le pseudo
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The buttons of the detail. */}
          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => panelRef.current.controls?.create({ category: entry.category, note: entry.note })}>
                  <CopyPlusIcon />
                  Dupliquer
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    const release = releaseOf(entry, () => removed([entry.username]));
                    ask(release.confirm, release.run);
                  }}
                >
                  <Trash2Icon />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </RowActions>
      ),
    }),
    // `removed` and `renamed` read only the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, ask],
  );
  const panel = useRowPanel<AdminReservedUsername>({
    config,
    title: (entry) => `@${entry.username}`,
    load: loadReservedUsername,
    detail: (username, controls) => <ReservedRowPanel username={username} canEdit={canEdit} panel={controls} />,
    ...(canEdit && {
      create: {
        id: "new:username",
        label: "Nouveau",
        title: "Nouveau pseudo",
        copyTitle: "Copie de pseudo",
        form: ({ initial, close, created }) => <ReservedCreate initial={initial} onCancel={close} onCreated={created} />,
      },
    }),
  });
  useLayoutEffect(() => {
    panelRef.current = { controls: panel, active: panel.table.activeRowId };
  });
  return (
    <>
      <DataTable {...panel.table} refreshKey={version} />
      {dialog}
    </>
  );
}
