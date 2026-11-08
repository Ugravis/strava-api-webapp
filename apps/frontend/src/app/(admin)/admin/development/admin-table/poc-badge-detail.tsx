"use client";

import { CopyIcon, FootprintsIcon, GaugeIcon, KeyRoundIcon, PaletteIcon, ShapesIcon, StickyNoteIcon, TextIcon, ToggleRightIcon, Trash2Icon, TypeIcon } from "lucide-react";
import { toast } from "sonner";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailCover,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailRelated,
  DetailSection,
  DetailSectionForm,
  DetailSkeleton,
  fromRule,
  LucideIconByName,
  type RowPanelControls,
} from "@kilotrace/ui/components/admin/detail";
import { useSplitPanel } from "@kilotrace/ui/components/split-panel";
import { UserAvatar } from "@kilotrace/ui/components/user/user-avatar";
import { PocUserPanel } from "./poc-detail";
import { BADGES_TABLE, COLLECTIONS, KEYWORDS, type PocBadge, SPORTS } from "./poc-order";
import { BADGE_RULES } from "./poc-rules";
import { loadPocBadge, loadPocBadgeHolders, pocLock, removePocBadges, savePocBadge, usePocSettings, usePocVersion } from "./poc-store";

const RULES: Record<PocBadge["collection"], string> = {
  distance:
    "Obtenu dès que le cumul des activités synchronisées atteint la distance du badge, toutes disciplines confondues. Les activités privées comptent, les activités supprimées sur Strava sont retirées du cumul à la synchronisation suivante, ce qui peut retirer le badge.",
  tiles:
    "Obtenu dès que l'ensemble des tuiles visitées contient un carré plein de la taille du badge. Une tuile compte dès qu'une trace la traverse, même brièvement ; les tuiles de zoom 17 ne comptent pas pour ce badge.",
  stations:
    "Obtenu dès que le nombre de gares traversées atteint le seuil du badge. Une gare compte quand une trace passe à moins de cinquante mètres de son bâtiment ou de ses quais, quel que soit le mode de transport de l'activité.",
};

/** The badge loaded by the panel, its skeleton meanwhile; loaded again once saved. */
export function PocBadgePanel({ id, panel }: { id: string; panel: RowPanelControls }) {
  const version = usePocVersion();
  return (
    <DetailLoader id={id} load={loadPocBadge} refreshKey={version} skeleton={<DetailSkeleton cover sections={[5, 2, 4, 2, 3, 2]} />}>
      {(badge) => <PocBadgeDetail badge={badge} panel={panel} version={version} />}
    </DetailLoader>
  );
}

/**
 * What the detail panel shows of a fake badge: its picture large as the
 * cover, then small as a field, a field of every kind edited in place
 * (following the shared rules of a badge), its holders, and its buttons kept
 * at the bottom. A moderator finds some of them locked.
 */
export function PocBadgeDetail({ badge, panel, version }: { badge: PocBadge; panel: RowPanelControls; version: number }) {
  const save = (patch: Parameters<typeof savePocBadge>[1]) => savePocBadge(badge.id, patch);
  // Read for the locks: a change of role draws the detail again.
  usePocSettings();
  const locked = pocLock();
  const { open } = useSplitPanel();
  return (
    <>
      <DetailCover image={badge.picture} />
      <DetailHeader
        media={<DetailMedia icon={<LucideIconByName name={badge.icon} />} color={badge.color ?? undefined} />}
        title={badge.name}
        subtitle={COLLECTIONS[badge.collection].label}
      />
      <DetailSection title="Badge">
        <DetailFields>
          {/* Its rule shared with the server: required, 40 characters at most. */}
          <DetailField label="Nom" icon={<TypeIcon />} copy={badge.name} edit={{ ...fromRule(BADGE_RULES.name), value: badge.name, onSave: (name) => save({ name }) }} />
        </DetailFields>
        {/* Drawn by its column, picked in a list; locked for a moderator, as in the table. */}
        <DetailColumnFields row={badge} columns={BADGES_TABLE.columns} ids={["picture", "collection", "holders", "createdAt"]} />
      </DetailSection>
      <DetailSection title="Apparence">
        <DetailFields>
          {/* Swatches, any hue or its code; cleared by « Aucune ». */}
          <DetailField label="Couleur" icon={<PaletteIcon />} edit={{ kind: "color", value: badge.color, noneLabel: "Aucune", onSave: (color) => save({ color }) }} />
          {/* Every icon of Lucide, searched by name. */}
          <DetailField label="Icône" icon={<ShapesIcon />} edit={{ kind: "icon", value: badge.icon, onSave: (icon) => save({ icon }) }} />
        </DetailFields>
      </DetailSection>
      <DetailSection title="Règle">
        <DetailFields>
          {/* A whole number from 1 (shared rule), locked for a moderator. */}
          <DetailField
            label="Seuil"
            icon={<GaugeIcon />}
            edit={{ kind: "number", ...fromRule(BADGE_RULES.threshold), locked, value: badge.threshold, unit: COLLECTIONS[badge.collection].unit, onSave: (threshold) => save({ threshold }) }}
          />
          {/* Saved as soon as switched. */}
          <DetailField label="Actif" icon={<ToggleRightIcon />} edit={{ kind: "switch", value: badge.active, onSave: (active) => save({ active }) }} />
          {/* A distance only; never left without a sport. */}
          {badge.collection === "distance" && (
            <DetailField label="Sports" icon={<FootprintsIcon />} edit={{ kind: "multiselect", value: badge.sports, options: SPORTS, required: true, onSave: (sports) => save({ sports }) }} />
          )}
          <DetailField label="Condition" icon={<TextIcon />} copy={RULES[badge.collection]} stacked>
            {RULES[badge.collection]}
          </DetailField>
        </DetailFields>
      </DetailSection>
      {/*
       * Bound to each other: edited together, saved by one « Valider », the
       * end refused before the start under its field (shared rule). Locked
       * for a moderator.
       */}
      <DetailSectionForm
        title="Période"
        initial={{ availableFrom: badge.availableFrom, endsAt: badge.endsAt }}
        rules={{ availableFrom: BADGE_RULES.availableFrom, endsAt: BADGE_RULES.endsAt }}
        locked={locked}
        onSubmit={({ availableFrom, endsAt }) => save({ availableFrom, endsAt })}
      >
        {(form) => (
          <DetailColumnFields
            row={badge}
            columns={BADGES_TABLE.columns}
            ids={[
              { id: "availableFrom", edit: form.bind("availableFrom", { kind: "date" }) },
              { id: "endsAt", edit: form.bind("endsAt", { kind: "date", time: true, min: form.values.availableFrom ?? undefined }) },
            ]}
          />
        )}
      </DetailSectionForm>
      <DetailSection title="Présentation">
        <DetailFields>
          {/* Markdown: drawn, typed with its preview. */}
          <DetailField
            label="Description"
            icon={<StickyNoteIcon />}
            stacked
            edit={{ kind: "markdown", ...fromRule(BADGE_RULES.description), value: badge.description, placeholder: "Ce que l'athlète lit sous le badge", onSave: (description) => save({ description }) }}
          />
          {/* Free values, suggestions offered. */}
          <DetailField
            label="Mots-clés"
            icon={<KeyRoundIcon />}
            edit={{ kind: "tags", ...fromRule(BADGE_RULES.keywords), max: 6, maxLength: 20, value: badge.keywords, suggestions: KEYWORDS, onSave: (keywords) => save({ keywords }) }}
          />
        </DetailFields>
      </DetailSection>
      <DetailSection title="Détenteurs">
        {/* Loaded by the block, each opened in the panel. */}
        <DetailRelated
          load={(offset) =>
            loadPocBadgeHolders(badge.id, offset).then(({ items, total }) => ({
              total,
              items: items.map((user) => ({
                id: user.id,
                media: <UserAvatar user={user} className="size-8" />,
                title: user.displayName ?? `@${user.username}`,
                subtitle: `@${user.username}`,
                onOpen: () => open(<PocUserPanel id={user.id} />, { id: user.id, title: `@${user.username}` }),
              })),
            }))
          }
          refreshKey={version}
          empty="Personne ne détient ce badge."
          all={{ label: "Voir tout", onClick: () => toast(`Ouvrirait la liste des comptes, filtrée sur « ${badge.name} »`) }}
        />
      </DetailSection>
      {/* Kept at the bottom of the panel as the detail scrolls. */}
      <DetailActions sticky>
        {/* A blank panel filled from this badge: nothing created before « Créer ». */}
        <DetailAction
          label="Dupliquer"
          icon={<CopyIcon aria-hidden />}
          onClick={() =>
            panel.create({
              name: `${badge.name} (copie)`,
              collection: badge.collection,
              picture: badge.picture?.src ?? null,
              color: badge.color,
              icon: badge.icon,
              threshold: badge.threshold,
              active: badge.active,
              availableFrom: badge.availableFrom,
              endsAt: badge.endsAt,
              description: badge.description,
              sports: badge.sports,
              keywords: badge.keywords,
            })
          }
        />
        {/* Asks first; then the panel closes, or shows the next badge (the simulation above). */}
        <DetailAction
          label="Supprimer"
          icon={<Trash2Icon aria-hidden />}
          variant="destructive"
          locked={locked}
          confirm={{ title: `Supprimer « ${badge.name} » ?`, description: `Ses ${badge.holders.toLocaleString("fr-FR")} détenteurs le perdent aussitôt. Cette suppression est définitive.`, confirmLabel: "Supprimer" }}
          onClick={async () => {
            const outcome = await removePocBadges([badge.id]);
            if (outcome.ok) panel.removed(badge.id);
            return outcome;
          }}
        />
      </DetailActions>
    </>
  );
}
