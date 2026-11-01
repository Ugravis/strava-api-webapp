"use client";

import type { AdminBadge, AdminBadgeTheme, AdminBadgeThemeRow } from "@kilotrace/shared/admin";
import { ActivityIcon, CalendarPlusIcon, CircleDotIcon, FingerprintIcon, FlagIcon, HeartIcon, LayersIcon, MedalIcon, RulerIcon, UserRoundIcon } from "lucide-react";
import {
  codeColumn,
  type DataTableColumn,
  dateColumn,
  lookColumn,
  numberColumn,
  orderColumn,
  pillsColumn,
  statusColumn,
  textColumn,
} from "@/components/admin/data-table";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { createVersion } from "@/lib/admin/version";
import { FAMILIES, goalOf, METRICS } from "./badge-bits";

/*
 * How badges and collections are drawn, shared by their tables and their details.
 */

/** The version of the catalog: the `refreshKey` of both tables and of the details. */
export const { useVersion: useCatalogVersion, bump: bumpCatalog } = createVersion();

/** `?row=` of a collection: apart from the ids of the badges, which never hold a colon. */
export const THEME_ROW = "collection:";

export const STATUSES = {
  active: { label: "Actif", tone: "green" },
  inactive: { label: "Désactivé", tone: "gray" },
} as const;

/** The name of a collection, its id when unknown. */
export const themeNameOf = (themes: AdminBadgeTheme[], id: string | null) => (id ? (themes.find((theme) => theme.id === id)?.name ?? id) : null);

export function badgeColumns(themes: AdminBadgeTheme[]): DataTableColumn<AdminBadge>[] {
  return [
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
      value: (badge) => (badge.themeId ? [{ label: themeNameOf(themes, badge.themeId) ?? badge.themeId, tone: "gray" }] : []),
    }),
    pillsColumn({ id: "metric", header: "Mesure", icon: <RulerIcon />, sortable: true, value: (badge) => [METRICS[badge.metric]] }),
    pillsColumn({ id: "family", header: "Sports", icon: <ActivityIcon />, sortable: true, value: (badge) => [FAMILIES[badge.family]] }),
    textColumn({ id: "goal", header: "Objectif", icon: <FlagIcon />, value: goalOf, width: "max-w-56" }),
    statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, value: (badge) => (badge.active ? "active" : "inactive"), statuses: STATUSES }),
    numberColumn({ id: "favorites", header: "Favoris", icon: <HeartIcon />, sortable: true, value: (badge) => badge.favoritesCount }),
    numberColumn({ id: "profiles", header: "Profils", icon: <UserRoundIcon />, sortable: true, value: (badge) => badge.profilesCount }),
    dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (badge) => badge.createdAt }),
  ];
}

export const THEME_COLUMNS: DataTableColumn<AdminBadgeThemeRow>[] = [
  orderColumn({ id: "position", header: "Ordre", value: (theme) => theme.position }),
  textColumn({ id: "name", header: "Collection", icon: <LayersIcon />, sortable: true, locked: true, value: (theme) => theme.name, width: "max-w-56" }),
  codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (theme) => theme.id }),
  numberColumn({ id: "badges", header: "Badges", icon: <MedalIcon />, sortable: true, value: (theme) => theme.badgesCount }),
];
