"use client";

import type { AdminBadgeThemeRow } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, FingerprintIcon, LayersIcon, MedalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { codeColumn, DataTable, type DataTableConfig, numberColumn, orderColumn, RowActions, textColumn } from "@/components/admin/data-table";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchThemesTable, moveTheme } from "./actions";
import { type BadgeRights, DeleteThemeDialog, ThemeFormDialog } from "./badge-bits";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The collections, tabs of the page Succès in this order; rows move by their handle. */
export function ThemesTable({ rights }: { rights: BadgeRights }) {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; theme: AdminBadgeThemeRow | null }>({ open: false, theme: null });
  const [deleting, setDeleting] = useState<{ open: boolean; theme: AdminBadgeThemeRow | null }>({ open: false, theme: null });
  // Each change gives a new source, fetched again.
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((each) => each + 1);

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
      columns: [
        orderColumn({ id: "position", header: "Ordre", value: (theme) => theme.position }),
        textColumn({ id: "name", header: "Collection", icon: <LayersIcon />, sortable: true, locked: true, value: (theme) => theme.name, width: "max-w-56" }),
        codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (theme) => theme.id }),
        numberColumn({ id: "badges", header: "Badges", icon: <MedalIcon />, sortable: true, value: (theme) => theme.badgesCount }),
      ],
      ...(rights.create && { create: { label: "Nouvelle", onClick: () => setEditing({ open: true, theme: null }) } }),
      ...(rights.edit && { reorder: moveTheme }),
      actions: (theme) => (
        <RowActions label={`Actions de ${theme.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(theme.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <DropdownMenuItem onClick={() => setEditing({ open: true, theme })}>
              <PencilIcon />
              Renommer
            </DropdownMenuItem>
          )}
          {rights.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ open: true, theme })}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    // `version` gives a new source, fetched again, after each change.
    [rights, version],
  );

  return (
    <>
      <DataTable config={config} />
      {(rights.create || rights.edit) && (
        <ThemeFormDialog open={editing.open} onOpenChange={(open) => setEditing({ ...editing, open })} onSuccess={changed} theme={editing.theme} />
      )}
      {rights.delete && (
        <DeleteThemeDialog open={deleting.open} onOpenChange={(open) => setDeleting({ ...deleting, open })} onSuccess={changed} theme={deleting.theme} />
      )}
    </>
  );
}
