"use client";

import { ADMIN_BADGE_FAMILIES, ADMIN_BADGE_METRICS, type AdminBadge, type AdminBadgeMetric, type AdminBadgeTheme } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, CopyPlusIcon, EyeIcon, EyeOffIcon, PanelRightOpenIcon, Trash2Icon } from "lucide-react";
import { type RefObject, useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions, SelectionAction, useConfirmDialog } from "@/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchBadgesTable, loadBadge, moveBadge } from "./actions";
import { type BadgeRights, deleteBadgeOf, FAMILIES, METRICS, toggleBadges, useCatalogVersion } from "./badge-bits";
import { badgeColumns, STATUSES, themeNameOf } from "./badge-columns";
import { BadgeCreate, BadgeRowPanel, copyOfBadge } from "./badge-detail";

/** Value of the filter of the badges out of any collection, as the backend knows it. */
const NO_THEME = "~";
/** Key of their group, as the backend sends it; else `0003-astronomy`. */
const NO_THEME_GROUP = "none";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The catalog of badges, grouped by collection in their order; rows move by
 * their handle, a click opens one in the side panel. `controlsRef` is given the
 * controls of the panel, for the collections to open their badges.
 */
export function BadgesTable({ themes, rights, controlsRef }: { themes: AdminBadgeTheme[]; rights: BadgeRights; controlsRef: RefObject<RowPanelControls | null> }) {
  const version = useCatalogVersion();
  const { ask, dialog } = useConfirmDialog();
  // The row shown in the panel, read by the menus of the rows: the config stays the same as it changes.
  const active = useRef<string | null>(null);

  const config = useMemo<DataTableConfig<AdminBadge>>(() => {
    const themeName = (id: string | null) => themeNameOf(themes, id);
    const toggle = (ids: string[], on: boolean, clear: () => void) => async () => {
      if (await toggleBadges(ids, on)) clear();
    };
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
      columns: badgeColumns(themes, rights.edit),
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
      ...(rights.edit && {
        reorder: moveBadge,
        bulkActions: (ids: string[], clear: () => void) => (
          <>
            <SelectionAction label="Activer" icon={<EyeIcon data-icon="inline-start" />} onClick={toggle(ids, true, clear)} />
            <SelectionAction label="Désactiver" icon={<EyeOffIcon data-icon="inline-start" />} onClick={toggle(ids, false, clear)} />
          </>
        ),
      }),
      actions: (badge) => (
        <RowActions label={`Actions de ${badge.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => controlsRef.current?.open(badge.id)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(badge.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The buttons of the detail open to this member. */}
          {(rights.create || rights.edit || rights.delete) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {rights.edit && (
                  <DropdownMenuItem onClick={() => toggleBadges([badge.id], !badge.active)}>
                    {badge.active ? <EyeOffIcon /> : <EyeIcon />}
                    {badge.active ? "Désactiver" : "Activer"}
                  </DropdownMenuItem>
                )}
                {rights.create && (
                  <DropdownMenuItem onClick={() => controlsRef.current?.create(copyOfBadge(badge))}>
                    <CopyPlusIcon />
                    Dupliquer
                  </DropdownMenuItem>
                )}
                {rights.delete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      const removal = deleteBadgeOf(badge, () => active.current === badge.id && controlsRef.current?.removed(badge.id));
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
    };
  }, [themes, rights, controlsRef, ask]);

  const panel = useRowPanel<AdminBadge>({
    config,
    title: (badge) => badge.name,
    load: loadBadge,
    detail: (id, panel) => <BadgeRowPanel id={id} themes={themes} rights={rights} panel={panel} />,
    ...(rights.create && {
      create: {
        id: "new:badge",
        label: "Nouveau",
        title: "Nouveau badge",
        copyTitle: "Copie de badge",
        form: ({ initial, close, created }) => <BadgeCreate themes={themes} initial={initial} onCancel={close} onCreated={created} />,
      },
    }),
  });
  useLayoutEffect(() => {
    controlsRef.current = panel;
    active.current = panel.table.activeRowId;
  });
  return (
    <>
      <DataTable {...panel.table} refreshKey={version} />
      {dialog}
    </>
  );
}
