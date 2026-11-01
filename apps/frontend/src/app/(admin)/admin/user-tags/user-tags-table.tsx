"use client";

import type { AdminUserTag } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, PanelRightOpenIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions } from "@/components/admin/data-table";
import { useSplitPanel } from "@/components/split-panel";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchUserTagsTable, loadUserTag, moveUserTag } from "./actions";
import { KINDS, USER_TAG_COLUMNS, type UserTagRights, useUserTagDialogs, useUserTagsVersion } from "./user-tag-bits";
import { UserTagRowPanel } from "./user-tag-detail";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The user tags, in the order of the profiles; rows move by their handle, a click opens one in the side panel. Those awarded by the code are never deleted. */
export function UserTagsTable({ rights: given }: { rights: UserTagRights }) {
  // A new object after each refresh of the page: kept while its values are the same.
  const rights = useMemo(() => given, [given.create, given.edit, given.delete]); // eslint-disable-line react-hooks/exhaustive-deps
  const version = useUserTagsVersion();
  const { openEdit, openDelete, dialogs } = useUserTagDialogs(rights);
  const { open, isOpen, activeId } = useSplitPanel();
  const openTag = useCallback(
    // Opened at once on its skeleton, the tag loaded by the panel.
    (userTag: { id: string; name: string }) => open(<UserTagRowPanel id={userTag.id} rights={rights} />, { id: userTag.id, title: userTag.name }),
    [open, rights],
  );
  // A shared link: the tag of `?row=`, once on arrival, fetched by id.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id) loadUserTag(id).then((userTag) => userTag && openTag(userTag), () => {});
  }, [openTag]);

  const config = useMemo<DataTableConfig<AdminUserTag>>(
    () => ({
      id: "tags",
      fetch: (query: TableQuery) => fetchUserTagsTable(query),
      rowId: (userTag) => userTag.id,
      search: "Nom, identifiant ou description",
      noun: (total) => (total > 1 ? "tags" : "tag"),
      empty: { title: "Aucun tag", description: "Les tags apparaîtront ici dès leur création." },
      defaultSort: { id: "position", desc: false },
      maxHeight: "none",
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["position", "name", "description", "kind", "holders"] },
        { id: "table", label: "Tableau", columns: ["position", "name", "description", "kind", "holders"] },
      ],
      columns: USER_TAG_COLUMNS,
      facets: [{ id: "kind", label: "Attribution", options: Object.entries(KINDS).map(([value, { label }]) => ({ value, label })) }],
      groupings: [{ id: "kind", label: "Attribution", title: (key) => KINDS[key as keyof typeof KINDS]?.label ?? key }],
      ...(rights.create && { create: { label: "Nouveau", onClick: () => openEdit(null) } }),
      ...(rights.edit && { reorder: moveUserTag }),
      actions: (userTag) => (
        <RowActions label={`Actions de ${userTag.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openTag(userTag)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(userTag.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <DropdownMenuItem onClick={() => openEdit(userTag)}>
              <PencilIcon />
              Modifier
            </DropdownMenuItem>
          )}
          {rights.delete && !userTag.system && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => openDelete(userTag)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    [rights, openTag, openEdit, openDelete],
  );

  return (
    <>
      <DataTable config={config} onRowClick={openTag} activeRowId={isOpen ? activeId : null} refreshKey={version} />
      {dialogs}
    </>
  );
}
