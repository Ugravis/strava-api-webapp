"use client";

import { ADMIN_BADGE_FAMILIES, ADMIN_BADGE_METRICS, type AdminBadge, type AdminBadgeMetric, type AdminBadgeTheme } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, EyeIcon, EyeOffIcon, PanelRightOpenIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchBadgesTable, moveBadge } from "./actions";
import { type BadgeRights, FAMILIES, METRICS } from "./badge-bits";
import { badgeColumns, STATUSES, themeNameOf, useCatalogVersion } from "./badge-columns";
import { toggleBadges, useBadgeDialogs } from "./badge-dialogs";
import { useCatalogPanel, useSharedRow, useStableRights } from "./catalog-panel";

/** Value of the filter of the badges out of any collection, as the backend knows it. */
const NO_THEME = "~";
/** Key of their group, as the backend sends it; else `0003-astronomy`. */
const NO_THEME_GROUP = "none";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The catalog of badges, grouped by collection in their order; rows move by their handle. */
export function BadgesTable({ themes, rights: given }: { themes: AdminBadgeTheme[]; rights: BadgeRights }) {
  const rights = useStableRights(given);
  const version = useCatalogVersion();
  const { openEdit, openDelete, dialogs } = useBadgeDialogs(themes, rights);
  const { openBadge, openTheme, activeBadge } = useCatalogPanel(themes, rights);
  useSharedRow(openBadge, openTheme);

  const config = useMemo<DataTableConfig<AdminBadge>>(() => {
    const themeName = (id: string | null) => themeNameOf(themes, id);
    return {
      id: "badges",
      fetch: (query: TableQuery) => fetchBadgesTable(query),
      rowId: (badge) => badge.id,
      search: "Nom, identifiant ou description",
      noun: (total) => (total > 1 ? "badges" : "badge"),
      empty: { title: "Aucun badge", description: "Les badges apparaîtront ici dès leur création." },
      defaultSort: { id: "position", desc: false },
      defaultGroupBy: "theme",
      muted: (badge) => !badge.active,
      views: [
        { id: "table", label: "Tableau", columns: ["position", "name", "theme", "metric", "family", "goal", "status", "favorites", "profiles"] },
        { id: "cards", label: "Cartes", layout: "cards", columns: ["position", "name", "theme", "metric", "family"] },
      ],
      columns: badgeColumns(themes),
      facets: [
        { id: "theme", label: "Collection", options: [...themes.map((theme) => ({ value: theme.id, label: theme.name })), { value: NO_THEME, label: "Sans collection" }] },
        { id: "metric", label: "Mesure", options: ADMIN_BADGE_METRICS.map((value) => ({ value, label: METRICS[value].label })) },
        { id: "family", label: "Sports", options: ADMIN_BADGE_FAMILIES.map((value) => ({ value, label: FAMILIES[value].label })) },
      ],
      groupings: [
        { id: "theme", label: "Collection", title: (key) => (key === NO_THEME_GROUP ? "Sans collection" : themeName(key.slice(key.indexOf("-") + 1))) },
        { id: "metric", label: "Mesure", title: (key) => METRICS[key as AdminBadgeMetric]?.label ?? key },
        { id: "family", label: "Sports", title: (key) => FAMILIES[key as AdminBadge["family"]]?.label ?? key },
        { id: "status", label: "Statut", title: (key) => STATUSES[key as keyof typeof STATUSES]?.label ?? key },
      ],
      ...(rights.create && { create: { label: "Nouveau", onClick: () => openEdit(null) } }),
      ...(rights.edit && {
        reorder: moveBadge,
        bulkActions: (ids: string[], clear: () => void) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => toggleBadges(ids, true).then((ok) => ok && clear())}>
              <EyeIcon data-icon="inline-start" />
              Activer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggleBadges(ids, false).then((ok) => ok && clear())}>
              <EyeOffIcon data-icon="inline-start" />
              Désactiver
            </Button>
          </>
        ),
      }),
      actions: (badge) => (
        <RowActions label={`Actions de ${badge.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => openBadge(badge)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(badge.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <>
              <DropdownMenuItem onClick={() => openEdit(badge)}>
                <PencilIcon />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleBadges([badge.id], !badge.active)}>
                {badge.active ? <EyeOffIcon /> : <EyeIcon />}
                {badge.active ? "Désactiver" : "Activer"}
              </DropdownMenuItem>
            </>
          )}
          {rights.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => openDelete(badge)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    };
  }, [themes, rights, openBadge, openEdit, openDelete]);

  return (
    <>
      <DataTable config={config} onRowClick={openBadge} activeRowId={activeBadge} refreshKey={version} />
      {dialogs}
    </>
  );
}
