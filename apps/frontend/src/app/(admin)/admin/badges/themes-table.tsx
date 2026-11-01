"use client";

import type { AdminBadgeTheme, AdminBadgeThemeRow } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, PanelRightOpenIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions } from "@/components/admin/data-table";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchThemesTable, moveTheme } from "./actions";
import type { BadgeRights } from "./badge-bits";
import { THEME_COLUMNS, useCatalogVersion } from "./badge-columns";
import { useThemeDialogs } from "./badge-dialogs";
import { useCatalogPanel, useStableRights } from "./catalog-panel";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The collections, tabs of the page Succès in this order; rows move by their handle, a click opens one in the side panel. */
export function ThemesTable({ themes, rights: given }: { themes: AdminBadgeTheme[]; rights: BadgeRights }) {
  const rights = useStableRights(given);
  const version = useCatalogVersion();
  const { openEdit, openDelete, dialogs } = useThemeDialogs(rights);
  const { openTheme, activeTheme } = useCatalogPanel(themes, rights);

  const config = useMemo<DataTableConfig<AdminBadgeThemeRow>>(
    () => ({
      id: "themes",
      fetch: (query: TableQuery) => fetchThemesTable(query),
      rowId: (theme) => theme.id,
      search: "Nom ou identifiant",
      noun: (total) => (total > 1 ? "collections" : "collection"),
      empty: { title: "Aucune collection", description: "Les collections regroupent des badges de tous les sports, en onglets sur la page Succès." },
      defaultSort: { id: "position", desc: false },
      maxHeight: "none",
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["position", "name", "id", "badges"] },
        { id: "table", label: "Tableau", columns: ["position", "name", "id", "badges"] },
      ],
      columns: THEME_COLUMNS,
      ...(rights.create && { create: { label: "Nouvelle", onClick: () => openEdit(null) } }),
      ...(rights.edit && { reorder: moveTheme }),
      actions: (theme) => (
        <RowActions label={`Actions de ${theme.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openTheme(theme)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(theme.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <DropdownMenuItem onClick={() => openEdit(theme)}>
              <PencilIcon />
              Renommer
            </DropdownMenuItem>
          )}
          {rights.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => openDelete(theme)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    [rights, openTheme, openEdit, openDelete],
  );

  return (
    <>
      <DataTable config={config} onRowClick={openTheme} activeRowId={activeTheme} refreshKey={version} />
      {dialogs}
    </>
  );
}
