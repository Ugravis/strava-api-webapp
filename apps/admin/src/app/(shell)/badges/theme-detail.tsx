"use client";

import { type AdminBadge, type AdminBadgeThemeRow, BADGE_THEME_RULES, type CreateBadgeThemeRequest } from "@kilotrace/shared/admin";
import { ArrowDownUpIcon, FingerprintIcon, LayersIcon, PanelRightOpenIcon, Trash2Icon, TypeIcon } from "lucide-react";
import { useMemo } from "react";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailField,
  DetailFields,
  DetailForm,
  DetailHeader,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
  type RowPanelControls,
} from "@kilotrace/ui/components/admin/detail";
import { BadgeIcon } from "@kilotrace/ui/components/distances/badge-icon";
import { cn } from "@kilotrace/ui/lib/utils";
import { createTheme, loadTheme } from "./actions";
import { type BadgeRights, bumpCatalog, deleteThemeOf, LOCKS, THEME_ROW, useCatalogVersion } from "./badge-bits";
import { themeColumns } from "./badge-columns";

/** A collection being typed. */
interface ThemeDraft {
  id: string | null;
  name: string | null;
}

/** The collection of `?row=` (`collection:<id>`), with its badges; null for another row. */
export const loadThemeRow = (row: string) => (row.startsWith(THEME_ROW) ? loadTheme(row.slice(THEME_ROW.length)) : Promise.resolve(null));

/** The collection loaded by the panel, with its badges; `onOpenBadge` opens one in the panel. `id` its `?row=`. */
export function ThemeRowPanel({ id, rights, onOpenBadge, panel }: { id: string; rights: BadgeRights; onOpenBadge: (id: string) => void; panel: RowPanelControls }) {
  const version = useCatalogVersion();
  return (
    <DetailLoader id={id} load={loadThemeRow} refreshKey={version} skeleton={<DetailSkeleton media actions={1} sections={[4, 4]} />}>
      {({ theme, badges }) => <ThemeDetail theme={theme} badges={badges} rights={rights} onOpenBadge={onOpenBadge} panel={panel} />}
    </DetailLoader>
  );
}

/** Everything about a collection, renamed in place, and its badges in their order. */
function ThemeDetail({
  theme,
  badges,
  rights,
  onOpenBadge,
  panel,
}: {
  theme: AdminBadgeThemeRow;
  badges: AdminBadge[];
  rights: BadgeRights;
  onOpenBadge: (id: string) => void;
  panel: RowPanelControls;
}) {
  const columns = useMemo(() => themeColumns(rights.edit), [rights.edit]);
  const removal = deleteThemeOf(theme, () => panel.removed(`${THEME_ROW}${theme.id}`));
  return (
    <>
      <DetailHeader media={<DetailMedia icon={<LayersIcon />} />} title={theme.name} subtitle={theme.id} />
      <DetailActions>
        <DetailAction
          label="Supprimer"
          icon={<Trash2Icon aria-hidden />}
          variant="destructive"
          locked={rights.delete ? null : LOCKS.delete}
          confirm={removal.confirm}
          onClick={removal.run}
        />
      </DetailActions>
      <DetailSection title="Collection">
        <DetailColumnFields row={theme} columns={columns} ids={["name", "id", "badges"]} />
        <DetailFields>
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
                  <DetailItemButton label={`Ouvrir ${badge.name}`} onClick={() => onOpenBadge(badge.id)}>
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

/** A collection to create: nothing saved before « Créer ». */
export function ThemeCreate({ onCancel, onCreated }: { onCancel: () => void; onCreated: (row: string) => void }) {
  return (
    <DetailForm<ThemeDraft>
      initial={{ id: null, name: null }}
      rules={BADGE_THEME_RULES}
      onSubmit={async (draft) => {
        const body: CreateBadgeThemeRequest = { id: draft.id ?? "", name: draft.name ?? "" };
        const result = await createTheme(body);
        if (result.ok) bumpCatalog();
        return result;
      }}
      onCancel={onCancel}
      onCreated={(created) => onCreated(`${THEME_ROW}${created.id!}`)}
      submitLabel="Créer la collection"
    >
      {(form) => (
        <>
          <DetailHeader
            media={<DetailMedia icon={<LayersIcon />} />}
            title={form.values.name?.trim() || "Nouvelle collection"}
            subtitle="Elle apparaît sur la page Succès dès qu'un badge actif en fait partie."
          />
          <DetailSection title="Collection">
            <DetailFields>
              <DetailField label="Nom" icon={<TypeIcon />} edit={form.bind("name", { kind: "text", placeholder: "Astronomie" })} />
              <DetailField label="Identifiant" icon={<FingerprintIcon />} edit={form.bind("id", { kind: "text", placeholder: "Minuscules, chiffres et _ ; définitif" })} />
            </DetailFields>
          </DetailSection>
        </>
      )}
    </DetailForm>
  );
}
