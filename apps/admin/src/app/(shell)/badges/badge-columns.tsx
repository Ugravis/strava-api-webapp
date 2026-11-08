"use client";

import { type AdminBadge, type AdminBadgeTheme, type AdminBadgeThemeRow, BADGE_RULES, BADGE_THEME_RULES } from "@kilotrace/shared/admin";
import {
  ActivityIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  FingerprintIcon,
  FlagIcon,
  HeartIcon,
  ImageIcon,
  LayersIcon,
  MedalIcon,
  PaletteIcon,
  RulerIcon,
  ShapesIcon,
  ToggleRightIcon,
  UserRoundIcon,
} from "lucide-react";
import {
  codeColumn,
  customColumn,
  type DataTableColumn,
  dateColumn,
  editColumn,
  lookColumn,
  numberColumn,
  orderColumn,
  pillsColumn,
  statusColumn,
  textColumn,
} from "@kilotrace/ui/components/admin/data-table";
import { BadgeBanner } from "@kilotrace/ui/components/distances/badge-banner";
import { BadgeIcon } from "@kilotrace/ui/components/distances/badge-icon";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { fromRule } from "@kilotrace/ui/components/admin/detail";
import { saveTheme, setBadgeActive } from "./actions";
import { bumpCatalog, FAMILIES, goalOf, LOCKS, METRICS, saveBadgeWith, themeOptions } from "./badge-bits";

/*
 * How badges and collections are drawn, shared by their tables and their details.
 */

export const STATUSES = {
  active: { label: "Actif", tone: "green" },
  inactive: { label: "Désactivé", tone: "gray" },
} as const;

/** The banner of the public detail of a badge: a cover, or a thumbnail when `small`. */
export function AdminBadgeBanner({ badge, small, className }: { badge: Pick<AdminBadge, "icon" | "family" | "tiers" | "backgroundColor">; small?: boolean; className?: string }) {
  const background = badge.backgroundColor ? { kind: "color" as const, color: badge.backgroundColor } : null;
  return <BadgeBanner badge={{ ...badge, background }} small={small} className={className} />;
}

/** The name of a collection, its id when unknown. */
export const themeNameOf = (themes: AdminBadgeTheme[], id: string | null) => (id ? (themes.find((theme) => theme.id === id)?.name ?? id) : null);

/** The columns of the badges; `edit` edits the name, the collection, the look and the status in place, in the table and in the detail. */
export function badgeColumns(themes: AdminBadgeTheme[], edit: boolean): DataTableColumn<AdminBadge>[] {
  const locked = edit ? null : LOCKS.edit;
  return [
    orderColumn({ id: "position", header: "Ordre", value: (badge) => badge.position }),
    lookColumn({
      id: "name",
      header: "Badge",
      icon: <MedalIcon />,
      sortable: true,
      value: (badge) => ({ icon: <BadgeIcon icon={badge.icon} />, name: badge.name, background: badge.backgroundColor }),
      edit: (badge) => ({ kind: "text", ...fromRule(BADGE_RULES.name), value: badge.name, locked, onSave: (name) => saveBadgeWith(badge, { name: name?.trim() ?? "" }) }),
    }),
    codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (badge) => badge.id }),
    // The cover of a card once ticked.
    customColumn({
      id: "banner",
      header: "Bannière",
      icon: <ImageIcon />,
      extra: true,
      cell: (badge) => <AdminBadgeBanner badge={badge} small className="h-6 w-10 rounded-sm" />,
      cover: (badge) => <AdminBadgeBanner badge={badge} className="w-full shrink-0 rounded-t-xl border-b" />,
      skeleton: <Skeleton className="h-6 w-10 rounded-sm" />,
    }),
    pillsColumn({
      id: "theme",
      header: "Collection",
      icon: <LayersIcon />,
      sortable: true,
      value: (badge) => (badge.themeId ? [{ label: themeNameOf(themes, badge.themeId) ?? badge.themeId, tone: "gray" }] : []),
      edit: (badge) => ({
        kind: "select",
        value: badge.themeId,
        options: themeOptions(themes),
        noneLabel: "Sans collection",
        locked,
        onSave: (themeId) => saveBadgeWith(badge, { themeId }),
      }),
    }),
    pillsColumn({ id: "metric", header: "Mesure", icon: <RulerIcon />, sortable: true, value: (badge) => [METRICS[badge.metric]] }),
    pillsColumn({ id: "family", header: "Sports", icon: <ActivityIcon />, sortable: true, value: (badge) => [FAMILIES[badge.family]] }),
    textColumn({ id: "goal", header: "Objectif", icon: <FlagIcon />, value: goalOf, width: "max-w-56" }),
    statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, value: (badge) => (badge.active ? "active" : "inactive"), statuses: STATUSES }),
    editColumn({
      id: "active",
      header: "Actif",
      icon: <ToggleRightIcon />,
      edit: (badge) => ({
        kind: "switch",
        value: badge.active,
        locked,
        onSave: async (active) => {
          const result = await setBadgeActive(badge.id, active);
          if (result.ok) bumpCatalog();
          return result;
        },
      }),
    }),
    editColumn({
      id: "icon",
      header: "Icône",
      icon: <ShapesIcon />,
      edit: (badge) => ({
        kind: "icon",
        ...fromRule(BADGE_RULES.icon),
        value: badge.icon,
        locked,
        onSave: (icon) => saveBadgeWith(badge, { icon: icon ?? badge.icon }),
      }),
    }),
    editColumn({
      id: "backgroundColor",
      header: "Fond",
      icon: <PaletteIcon />,
      edit: (badge) => ({
        kind: "color",
        ...fromRule(BADGE_RULES.backgroundColor),
        value: badge.backgroundColor,
        noneLabel: "Fond par défaut",
        locked,
        onSave: (backgroundColor) => saveBadgeWith(badge, { backgroundColor }),
      }),
    }),
    numberColumn({ id: "favorites", header: "Favoris", icon: <HeartIcon />, sortable: true, value: (badge) => badge.favoritesCount }),
    numberColumn({ id: "profiles", header: "Profils", icon: <UserRoundIcon />, sortable: true, value: (badge) => badge.profilesCount }),
    dateColumn({ id: "createdAt", header: "Création", icon: <CalendarPlusIcon />, sortable: true, value: (badge) => badge.createdAt }),
  ];
}

/** The columns of the collections; `edit` renames one in place, in the table and in the detail. */
export const themeColumns = (edit: boolean): DataTableColumn<AdminBadgeThemeRow>[] => [
  orderColumn({ id: "position", header: "Ordre", value: (theme) => theme.position }),
  textColumn({
    id: "name",
    header: "Collection",
    icon: <LayersIcon />,
    sortable: true,
    locked: true,
    value: (theme) => theme.name,
    width: "max-w-56",
    edit: (theme) => ({
      kind: "text",
      ...fromRule(BADGE_THEME_RULES.name),
      value: theme.name,
      locked: edit ? null : LOCKS.edit,
      onSave: async (name) => {
        const result = await saveTheme(theme.id, name ?? "");
        if (result.ok) bumpCatalog();
        return result;
      },
    }),
  }),
  codeColumn({ id: "id", header: "Identifiant", icon: <FingerprintIcon />, sortable: true, value: (theme) => theme.id }),
  numberColumn({ id: "badges", header: "Badges", icon: <MedalIcon />, sortable: true, value: (theme) => theme.badgesCount }),
];
