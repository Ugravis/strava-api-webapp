"use client";

import type { AdminBadge, AdminBadgeThemeRow } from "@kilotrace/shared/admin";
import { ArrowDownUpIcon, LayersIcon, PanelRightOpenIcon, PencilIcon, Trash2Icon, TypeIcon } from "lucide-react";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
} from "@/components/admin/detail";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { cn } from "@/lib/utils";
import { loadTheme, saveTheme } from "./actions";
import type { BadgeRights } from "./badge-bits";
import { bumpCatalog, THEME_COLUMNS, useCatalogVersion } from "./badge-columns";
import { useThemeDialogs } from "./badge-dialogs";

/** The collection loaded by the panel, with its badges; `onOpenBadge` opens one in the panel. */
export function ThemeRowPanel({ id, rights, onOpenBadge }: { id: string; rights: BadgeRights; onOpenBadge: (badge: AdminBadge) => void }) {
  const version = useCatalogVersion();
  const actions = (rights.edit ? 1 : 0) + (rights.delete ? 1 : 0);
  return (
    <DetailLoader id={id} load={loadTheme} refreshKey={version} skeleton={<DetailSkeleton actions={actions} sections={[4, 4]} />}>
      {({ theme, badges }) => <ThemeDetail theme={theme} badges={badges} rights={rights} onOpenBadge={onOpenBadge} />}
    </DetailLoader>
  );
}

/** Everything about a collection, and its badges in their order. */
function ThemeDetail({
  theme,
  badges,
  rights,
  onOpenBadge,
}: {
  theme: AdminBadgeThemeRow;
  badges: AdminBadge[];
  rights: BadgeRights;
  onOpenBadge: (badge: AdminBadge) => void;
}) {
  const { openEdit, openDelete, dialogs } = useThemeDialogs(rights);
  const field = (id: string) => <DetailColumnField row={theme} columns={THEME_COLUMNS} id={id} />;
  const rename = async (name: string | null) => {
    const result = await saveTheme(theme.id, name ?? "");
    if (result.ok) bumpCatalog();
    return result;
  };

  return (
    <>
      <DetailHeader media={<DetailMedia icon={<LayersIcon />} />} title={theme.name} subtitle={theme.id} />
      {(rights.edit || rights.delete) && (
        <DetailActions>
          {rights.edit && <DetailAction label="Renommer" icon={<PencilIcon aria-hidden />} onClick={() => openEdit(theme)} />}
          {rights.delete && <DetailAction label="Supprimer" icon={<Trash2Icon aria-hidden />} variant="destructive" onClick={() => openDelete(theme)} />}
        </DetailActions>
      )}
      {dialogs}
      <DetailSection title="Collection">
        <DetailFields>
          {rights.edit ? <DetailField label="Nom" icon={<TypeIcon />} edit={{ value: theme.name, onSave: rename }} /> : field("name")}
          {field("id")}
          {field("badges")}
          <DetailField label="Position" icon={<ArrowDownUpIcon />}>
            {theme.position}
          </DetailField>
        </DetailFields>
      </DetailSection>
      <DetailSection title="Badges">
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun badge dans cette collection.</p>
        ) : (
          <DetailItems>
            {badges.map((badge) => (
              <DetailItem
                key={badge.id}
                icon={<BadgeIcon icon={badge.icon} />}
                actions={
                  <DetailItemButton label={`Ouvrir ${badge.name}`} onClick={() => onOpenBadge(badge)}>
                    <PanelRightOpenIcon />
                  </DetailItemButton>
                }
              >
                <span className={cn(!badge.active && "text-muted-foreground")}>{badge.name}</span>
              </DetailItem>
            ))}
          </DetailItems>
        )}
      </DetailSection>
    </>
  );
}
