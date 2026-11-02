"use client";

import { ADMIN_ROLES, type AdminRole, type AdminTeamMember } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, ListClockIcon, PanelRightOpenIcon, UserMinusIcon, UsersIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, RowActions, useConfirmDialog } from "@/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { publicNameOf } from "@/lib/user";
import { fetchTeamTable, loadTeamMember } from "./actions";
import { lockOf, removalOf, ROLES, teamColumns, useTeamVersion } from "./team-columns";
import { MemberCreate, MemberRowPanel, type TeamPaths } from "./team-detail";

/** Keys of the grouping by role, as the backend sends them: the rank from the top. */
const roleOfGroup = (key: string): AdminRole | undefined => [...ADMIN_ROLES].reverse()[Number(key) - 1];

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The team, highest role first, a member opened in the side panel. Every
 * member reads, `canEdit` adds members, changes their role or removes them,
 * never on one's own row.
 */
export function TeamTable({ meId, canEdit, paths }: { meId: string | null; canEdit: boolean; paths: TeamPaths }) {
  const router = useRouter();
  const version = useTeamVersion();
  const { ask, dialog } = useConfirmDialog();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<{ controls: RowPanelControls | null; active: string | null }>({ controls: null, active: null });

  const config = useMemo<DataTableConfig<AdminTeamMember>>(
    () => ({
      id: "team",
      fetch: (query: TableQuery) => fetchTeamTable(query),
      rowId: (member) => member.id,
      search: "Nom, @username ou e-mail",
      noun: (count) => (count > 1 ? "membres" : "membre"),
      empty: { title: "Aucun membre", description: "Personne dans l'équipe pour l'instant." },
      defaultSort: { id: "role", desc: true },
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["member", "role", "email", "logsCount"] },
        { id: "table", label: "Table" },
      ],
      columns: teamColumns(meId, canEdit),
      facets: [{ id: "role", label: "Rôle", options: [...ADMIN_ROLES].reverse().map((role) => ({ value: role, label: ROLES[role].label })) }],
      groupings: [{ id: "role", label: "Rôle", title: (key) => ROLES[roleOfGroup(key) ?? "support"].label }],
      actions: (member) => (
        <RowActions label={`Actions de @${member.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current.controls?.open(member.id)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(member.email, "E-mail copié")}>
              <CopyIcon />
              Copier l&apos;e-mail
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The buttons of the detail. */}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push(`${paths.users}?row=${member.id}`)}>
              <UsersIcon />
              Voir le compte
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${paths.auditLog}?actor=${member.id}`)}>
              <ListClockIcon />
              Voir ses logs
            </DropdownMenuItem>
            {!lockOf(member, meId, canEdit) && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  const removal = removalOf(member, () => {
                    const { controls, active } = panelRef.current;
                    if (active === member.id) controls?.removed(member.id);
                  });
                  ask(removal.confirm, removal.run);
                }}
              >
                <UserMinusIcon />
                Retirer de l&apos;équipe
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        </RowActions>
      ),
    }),
    [ask, canEdit, meId, paths, router],
  );
  const panel = useRowPanel<AdminTeamMember>({
    config,
    title: publicNameOf,
    load: loadTeamMember,
    detail: (id, controls) => <MemberRowPanel id={id} meId={meId} canEdit={canEdit} paths={paths} panel={controls} />,
    ...(canEdit && {
      create: { id: "new:member", label: "Ajouter", title: "Nouveau membre", form: ({ close, created }) => <MemberCreate meId={meId} onCancel={close} onCreated={created} /> },
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
