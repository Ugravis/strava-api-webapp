"use client";

import type { AdminBadge, AdminBadgeTheme } from "@kilotrace/shared/admin";
import { ArrowDownUpIcon, EyeIcon, EyeOffIcon, PaletteIcon, PencilIcon, ShapesIcon, StickyNoteIcon, Trash2Icon, TypeIcon } from "lucide-react";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
} from "@/components/admin/detail";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { loadBadge, saveBadge } from "./actions";
import type { BadgeRights } from "./badge-bits";
import { badgeColumns, bumpCatalog, useCatalogVersion } from "./badge-columns";
import { toggleBadges, useBadgeDialogs } from "./badge-dialogs";

/** The badge loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function BadgeRowPanel({ id, themes, rights }: { id: string; themes: AdminBadgeTheme[]; rights: BadgeRights }) {
  const version = useCatalogVersion();
  const actions = (rights.edit ? 2 : 0) + (rights.delete ? 1 : 0);
  return (
    <DetailLoader id={id} load={loadBadge} refreshKey={version} skeleton={<DetailSkeleton actions={actions} sections={[7, 3, 2, 2]} />}>
      {(badge) => <BadgeDetail badge={badge} themes={themes} rights={rights} />}
    </DetailLoader>
  );
}

/** Everything about a badge, and what the rights allow on it. */
function BadgeDetail({ badge, themes, rights }: { badge: AdminBadge; themes: AdminBadgeTheme[]; rights: BadgeRights }) {
  const { openEdit, openDelete, dialogs } = useBadgeDialogs(themes, rights);
  const columns = badgeColumns(themes);
  const field = (id: string) => <DetailColumnField row={badge} columns={columns} id={id} />;
  const save = async (patch: Partial<Pick<AdminBadge, "name" | "description">>) => {
    const { metric, family, target, tiers, name, description, themeId, icon, backgroundColor } = badge;
    const result = await saveBadge(badge.id, { metric, family, target, tiers, name, description, themeId, icon, backgroundColor, ...patch });
    if (result.ok) bumpCatalog();
    return result;
  };

  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<BadgeIcon icon={badge.icon} />} background={badge.backgroundColor} />}
        title={badge.name}
        subtitle={badge.id}
      />
      {(rights.edit || rights.delete) && (
        <DetailActions>
          {rights.edit && (
            <>
              <DetailAction label="Modifier" icon={<PencilIcon aria-hidden />} onClick={() => openEdit(badge)} />
              <DetailAction
                label={badge.active ? "Désactiver" : "Activer"}
                icon={badge.active ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
                onClick={() => toggleBadges([badge.id], !badge.active)}
              />
            </>
          )}
          {rights.delete && <DetailAction label="Supprimer" icon={<Trash2Icon aria-hidden />} variant="destructive" onClick={() => openDelete(badge)} />}
        </DetailActions>
      )}
      {dialogs}
      <DetailSection title="Badge">
        <DetailFields>
          {rights.edit ? <DetailField label="Nom" icon={<TypeIcon />} edit={{ value: badge.name, onSave: (name) => save({ name: name ?? "" }) }} /> : field("name")}
          {field("id")}
          {rights.edit ? (
            <DetailField
              label="Description"
              icon={<StickyNoteIcon />}
              stacked
              edit={{ value: badge.description, multiline: true, onSave: (description) => save({ description: description ?? "" }) }}
            />
          ) : (
            <DetailField label="Description" icon={<StickyNoteIcon />} stacked={!!badge.description}>
              {badge.description}
            </DetailField>
          )}
          {field("theme")}
          {field("status")}
          <DetailField label="Position" icon={<ArrowDownUpIcon />}>
            {badge.position}
          </DetailField>
          {field("createdAt")}
        </DetailFields>
      </DetailSection>
      <DetailSection title="Objectif">
        <DetailFields>
          {field("metric")}
          {field("family")}
          {field("goal")}
        </DetailFields>
      </DetailSection>
      <DetailSection title="Apparence">
        <DetailFields>
          <DetailField label="Icône" icon={<ShapesIcon />} copy={badge.icon}>
            <span className="inline-flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
                <BadgeIcon icon={badge.icon} />
              </span>
              {badge.icon}
            </span>
          </DetailField>
          <DetailField label="Fond" icon={<PaletteIcon />} copy={badge.backgroundColor}>
            {badge.backgroundColor ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-4 rounded-full border" style={{ backgroundColor: badge.backgroundColor }} aria-hidden />
                {badge.backgroundColor}
              </span>
            ) : (
              "Par défaut"
            )}
          </DetailField>
        </DetailFields>
      </DetailSection>
      <DetailSection title="Usage">
        <DetailFields>
          {field("favorites")}
          {field("profiles")}
        </DetailFields>
      </DetailSection>
    </>
  );
}
