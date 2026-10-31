"use client";

import { ADMIN_BADGE_FAMILIES, ADMIN_BADGE_METRICS, type AdminBadge, type AdminBadgeMetric, type AdminBadgeTheme } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import {
  ActivityIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  FingerprintIcon,
  FlagIcon,
  HeartIcon,
  LayersIcon,
  MedalIcon,
  PencilIcon,
  RulerIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  codeColumn,
  DataTable,
  type DataTableConfig,
  dateColumn,
  lookColumn,
  numberColumn,
  orderColumn,
  pillsColumn,
  RowActions,
  statusColumn,
  textColumn,
} from "@/components/admin/data-table";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { Button } from "@/components/ui/button";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { fetchBadgesTable, moveBadge, setBadgeActive, setBadgesActive } from "./actions";
import { BadgeFormDialog, type BadgeRights, DeleteBadgeDialog, FAMILIES, goalOf, METRICS } from "./badge-bits";

const STATUSES = {
  active: { label: "Actif", tone: "green" },
  inactive: { label: "Désactivé", tone: "gray" },
} as const;

/** Value of the filter of the badges out of any collection, as the backend knows it. */
const NO_THEME = "~";
/** Key of their group, as the backend sends it; else `0003-astronomy`. */
const NO_THEME_GROUP = "none";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The catalog of badges, grouped by collection in their order; rows move by their handle. */
export function BadgesTable({ themes, rights }: { themes: AdminBadgeTheme[]; rights: BadgeRights }) {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; badge: AdminBadge | null }>({ open: false, badge: null });
  const [deleting, setDeleting] = useState<{ open: boolean; badge: AdminBadge | null }>({ open: false, badge: null });
  // Each change gives a new source, fetched again.
  const [version, setVersion] = useState(0);
  const changed = () => setVersion((each) => each + 1);

  const config = useMemo<DataTableConfig<AdminBadge>>(() => {
    const themeName = (id: string | null) => (id ? (themes.find((theme) => theme.id === id)?.name ?? id) : null);
    const toggle = async (ids: string[], active: boolean) => {
      const result = ids.length === 1 ? await setBadgeActive(ids[0], active) : await setBadgesActive(ids, active);
      if (result.ok) {
        toast.success(active ? "Activé" : "Désactivé");
        changed();
      } else {
        toast.error(result.message);
      }
      return result.ok;
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
      columns: [
        orderColumn({ id: "position", header: "Ordre", value: (badge) => badge.position }),
        lookColumn({
          id: "name",
          header: "Badge",
          icon: <MedalIcon />,
          sortable: true,
          value: (badge) => ({ icon: <BadgeIcon icon={badge.icon} />, name: badge.name, background: badge.backgroundColor }),
        }),
        codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (badge) => badge.id }),
        pillsColumn({
          id: "theme",
          header: "Collection",
          icon: <LayersIcon />,
          sortable: true,
          value: (badge) => (badge.themeId ? [{ label: themeName(badge.themeId) ?? badge.themeId, tone: "gray" }] : []),
        }),
        pillsColumn({ id: "metric", header: "Mesure", icon: <RulerIcon />, sortable: true, value: (badge) => [METRICS[badge.metric]] }),
        pillsColumn({ id: "family", header: "Sports", icon: <ActivityIcon />, sortable: true, value: (badge) => [FAMILIES[badge.family]] }),
        textColumn({ id: "goal", header: "Objectif", icon: <FlagIcon />, value: goalOf, width: "max-w-56" }),
        statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, value: (badge) => (badge.active ? "active" : "inactive"), statuses: STATUSES }),
        numberColumn({ id: "favorites", header: "Favoris", icon: <HeartIcon />, sortable: true, value: (badge) => badge.favoritesCount }),
        numberColumn({ id: "profiles", header: "Profils", icon: <UserRoundIcon />, sortable: true, value: (badge) => badge.profilesCount }),
        dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (badge) => badge.createdAt }),
      ],
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
      ...(rights.create && { create: { label: "Nouveau", onClick: () => setEditing({ open: true, badge: null }) } }),
      ...(rights.edit && {
        reorder: moveBadge,
        bulkActions: (ids: string[], clear: () => void) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => toggle(ids, true).then((ok) => ok && clear())}>
              <EyeIcon data-icon="inline-start" />
              Activer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => toggle(ids, false).then((ok) => ok && clear())}>
              <EyeOffIcon data-icon="inline-start" />
              Désactiver
            </Button>
          </>
        ),
      }),
      actions: (badge) => (
        <RowActions label={`Actions de ${badge.name}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(badge.id, "Identifiant copié")}>
              <CopyIcon />
              Copier l&apos;identifiant
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {rights.edit && (
            <>
              <DropdownMenuItem onClick={() => setEditing({ open: true, badge })}>
                <PencilIcon />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggle([badge.id], !badge.active)}>
                {badge.active ? <EyeOffIcon /> : <EyeIcon />}
                {badge.active ? "Désactiver" : "Activer"}
              </DropdownMenuItem>
            </>
          )}
          {rights.delete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting({ open: true, badge })}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    };
    // `version` gives a new source, fetched again, after each change.
  }, [themes, rights, version]);

  return (
    <>
      <DataTable config={config} />
      {(rights.create || rights.edit) && (
        <BadgeFormDialog
          open={editing.open}
          onOpenChange={(open) => setEditing({ ...editing, open })}
          onSuccess={changed}
          badge={editing.badge}
          themes={themes}
        />
      )}
      {rights.delete && (
        <DeleteBadgeDialog open={deleting.open} onOpenChange={(open) => setDeleting({ ...deleting, open })} onSuccess={changed} badge={deleting.badge} />
      )}
    </>
  );
}
