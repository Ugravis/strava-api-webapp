"use client";

import type { AdminUserTag } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, CopyPlusIcon, PanelRightOpenIcon, Trash2Icon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions, useConfirmDialog } from "@/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchUserTagsTable, loadUserTag, moveUserTag } from "./actions";
import { deleteLock, deleteOf, KINDS, userTagColumns, type UserTagRights, useUserTagsVersion } from "./user-tag-bits";
import { UserTagCreate, UserTagRowPanel } from "./user-tag-detail";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The user tags, in the order of the profiles; rows move by their handle, a click opens one in the side panel. Those awarded by the code are never deleted. */
export function UserTagsTable({ rights: given, usersPath }: { rights: UserTagRights; usersPath: string }) {
  // A new object after each refresh of the page: kept while its values are the same.
  const rights = useMemo(() => given, [given.create, given.edit, given.delete]); // eslint-disable-line react-hooks/exhaustive-deps
  const version = useUserTagsVersion();
  const { ask, dialog } = useConfirmDialog();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<{ controls: RowPanelControls | null; active: string | null }>({ controls: null, active: null });

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
      columns: userTagColumns(rights.edit),
      facets: [{ id: "kind", label: "Attribution", options: Object.entries(KINDS).map(([value, { label }]) => ({ value, label })) }],
      groupings: [{ id: "kind", label: "Attribution", title: (key) => KINDS[key as keyof typeof KINDS]?.label ?? key }],
      ...(rights.edit && { reorder: moveUserTag }),
      actions: (userTag) => (
        <RowActions label={`Actions de ${userTag.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current.controls?.open(userTag.id)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(userTag.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The buttons of the detail open to this member. */}
          {(rights.create || !deleteLock(userTag, rights)) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {rights.create && (
                  <DropdownMenuItem
                    onClick={() => panelRef.current.controls?.create({ name: userTag.name, description: userTag.description, icon: userTag.icon, color: userTag.color })}
                  >
                    <CopyPlusIcon />
                    Dupliquer
                  </DropdownMenuItem>
                )}
                {!deleteLock(userTag, rights) && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      const removal = deleteOf(userTag, () => {
                        const { controls, active } = panelRef.current;
                        if (active === userTag.id) controls?.removed(userTag.id);
                      });
                      ask(removal.confirm, removal.run);
                    }}
                  >
                    <Trash2Icon />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </>
          )}
        </RowActions>
      ),
    }),
    [rights, ask],
  );
  const panel = useRowPanel<AdminUserTag>({
    config,
    title: (userTag) => userTag.name,
    load: loadUserTag,
    detail: (id, controls) => <UserTagRowPanel id={id} rights={rights} usersPath={usersPath} panel={controls} />,
    ...(rights.create && {
      create: {
        id: "new:tag",
        label: "Nouveau",
        title: "Nouveau tag",
        copyTitle: "Copie de tag",
        form: ({ initial, close, created }) => <UserTagCreate initial={initial} onCancel={close} onCreated={created} />,
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
