"use client";

import type { AdminMeResponse, AdminUserSummary, AdminUserTagLook } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, ExternalLinkIcon, ListClockIcon, PanelRightOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, RowActions } from "@/components/admin/data-table";
import { useSplitPanel } from "@/components/split-panel";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { userProfileHref } from "@/config/routes";
import { actRefusal } from "@/lib/admin/permissions";
import { fetchUsersTable, loadUserDetail } from "./actions";
import { CONNECTIONS, ROLES, type Status, STATUSES, USER_COLUMNS, UserTagIcon } from "./user-columns";
import { useUserActionDialog, userActionsOf } from "./user-actions";
import { UserRowPanel } from "./user-detail";
import { useUsersVersion } from "./users-store";

/** Key of the facet and of the group of the accounts without any tag. */
const NO_TAG = "none";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The accounts; a click opens one in the side panel. `tags` is the catalog, in its order. */
export function UsersTable({ me, auditLogPath, tags }: { me: AdminMeResponse; auditLogPath: string; tags: AdminUserTagLook[] }) {
  const router = useRouter();
  const { open, isOpen, activeId } = useSplitPanel();
  const version = useUsersVersion();
  const { openAction, dialog } = useUserActionDialog();
  const openUser = useCallback(
    // Opened at once on its skeleton, the account loaded by the panel.
    (user: { id: string; username: string }) => open(<UserRowPanel id={user.id} />, { id: user.id, title: `@${user.username}` }),
    [open],
  );
  // A shared link: the account of `?row=`, once on arrival, fetched by id.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id) loadUserDetail(id).then((data) => data && openUser(data.user), () => {});
  }, [openUser]);

  const config = useMemo<DataTableConfig<AdminUserSummary>>(() => {
    return {
      id: "users",
      fetch: (query: TableQuery) => fetchUsersTable(query),
      rowId: (user) => user.id,
      muted: (user) => !!user.suspension,
      search: "Nom, @username, e-mail ou ID",
      noun: (count) => (count > 1 ? "comptes" : "compte"),
      empty: { title: "Aucun compte", description: "Les comptes apparaîtront ici dès la première inscription." },
      defaultSort: { id: "createdAt", desc: true },
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["user", "createdAt", "lastSeenAt"] },
        { id: "compact", label: "Table compacte", columns: ["user", "createdAt", "lastSeenAt", "userTags", "activities"] },
        {
          id: "detailed",
          label: "Table détaillée",
          columns: ["user", "displayName", "status", "email", "createdAt", "lastSeenAt", "connections", "userTags", "activities", "id"],
        },
      ],
      columns: USER_COLUMNS,
      facets: [
        { id: "connections", label: "Connexion", options: Object.entries(CONNECTIONS).map(([value, { label, icon }]) => ({ value, label, icon })) },
        {
          id: "userTags",
          label: "Tags",
          options: [...tags.map((tag) => ({ value: tag.id, label: tag.name, icon: <UserTagIcon tag={tag} /> })), { value: NO_TAG, label: "Sans tag" }],
        },
      ],
      groupings: [
        { id: "status", label: "Statut", title: (key) => STATUSES[key as Status].label },
        { id: "role", label: "Rôle", title: (key) => ROLES[key]?.label ?? "Sans rôle" },
        {
          // By the first tag of the account, in the order of the catalog.
          id: "userTags",
          label: "Tag principal",
          title: (key) => {
            const tag = tags.find((each) => each.id === key);
            return tag ? (
              <span className="inline-flex items-center gap-1.5">
                <UserTagIcon tag={tag} />
                {tag.name}
              </span>
            ) : (
              "Sans tag"
            );
          },
        },
      ],
      actions: (user) => (
        <RowActions label={`Actions de @${user.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openUser(user)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(userProfileHref(user.username), "_blank", "noopener")}>
              <ExternalLinkIcon />
              Voir le profil public
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${auditLogPath}?target=${user.id}`)}>
              <ListClockIcon />
              Voir le journal
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The buttons of the detail, unless the member may not act on this account. */}
          {!actRefusal(me, user) && userActionsOf(user, me.permissions).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {userActionsOf(user, me.permissions).map((action) => (
                  <DropdownMenuItem key={action.key} variant={action.destructive ? "destructive" : "default"} onClick={() => openAction(user, action.key)}>
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(user.id, "ID copié")}>
              <CopyIcon />
              Copier l&apos;ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </RowActions>
      ),
    };
  }, [router, auditLogPath, tags, me, openUser, openAction]);

  return (
    <>
      <DataTable config={config} onRowClick={openUser} activeRowId={isOpen ? activeId : null} refreshKey={version} />
      {dialog}
    </>
  );
}
