"use client";

import type { AdminBadgeThemeRow } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, PanelRightOpenIcon, Trash2Icon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions, type TableMove, useConfirmDialog } from "@/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchThemesTable, moveTheme } from "./actions";
import { type BadgeRights, deleteThemeOf, THEME_ROW, useCatalogVersion } from "./badge-bits";
import { themeColumns } from "./badge-columns";
import { loadThemeRow, ThemeCreate, ThemeRowPanel } from "./theme-detail";

/** Its `?row=`, apart from the ids of the badges: the id of a collection in the table. */
const rowOf = (id: string) => `${THEME_ROW}${id}`;
const idOf = (row: string) => row.slice(THEME_ROW.length);

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** A move of the table, its rows told back by the ids of their collections. */
const move = ({ id, after, before }: TableMove) => moveTheme({ id: idOf(id), after: after && idOf(after), before: before && idOf(before) });

/**
 * The collections, tabs of the page Succès in this order; rows move by their
 * handle, a click opens one in the side panel, `openBadge` one of its badges.
 */
export function ThemesTable({ rights, openBadge }: { rights: BadgeRights; openBadge: (id: string) => void }) {
  const version = useCatalogVersion();
  const { ask, dialog } = useConfirmDialog();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<{ controls: RowPanelControls | null; active: string | null }>({ controls: null, active: null });

  const config = useMemo<DataTableConfig<AdminBadgeThemeRow>>(
    () => ({
      id: "themes",
      fetch: (query: TableQuery) => fetchThemesTable(query),
      rowId: (theme) => rowOf(theme.id),
      search: "Nom ou identifiant",
      noun: (total) => (total > 1 ? "collections" : "collection"),
      empty: { title: "Aucune collection", description: "Les collections regroupent des badges de tous les sports, en onglets sur la page Succès." },
      defaultSort: { id: "position", desc: false },
      maxHeight: "none",
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["position", "name", "id", "badges"] },
        { id: "table", label: "Tableau", columns: ["position", "name", "id", "badges"] },
      ],
      columns: themeColumns(rights.edit),
      ...(rights.edit && { reorder: move }),
      actions: (theme) => (
        <RowActions label={`Actions de ${theme.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current.controls?.open(rowOf(theme.id))}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(theme.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The button of the detail, when open to this member. */}
          {rights.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  const removal = deleteThemeOf(theme, () => {
                    const { controls, active } = panelRef.current;
                    if (active === rowOf(theme.id)) controls?.removed(rowOf(theme.id));
                  });
                  ask(removal.confirm, removal.run);
                }}
              >
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    [rights, ask],
  );

  const panel = useRowPanel<AdminBadgeThemeRow>({
    config,
    title: (theme) => theme.name,
    load: (row) => loadThemeRow(row).then((found) => found?.theme ?? null),
    detail: (row, controls) => <ThemeRowPanel id={row} rights={rights} onOpenBadge={openBadge} panel={controls} />,
    ...(rights.create && {
      create: {
        id: "new:collection",
        label: "Nouvelle",
        title: "Nouvelle collection",
        form: ({ close, created }) => <ThemeCreate onCancel={close} onCreated={created} />,
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
