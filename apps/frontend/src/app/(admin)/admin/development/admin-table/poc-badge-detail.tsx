"use client";

import { CalendarClockIcon, CalendarIcon, CopyIcon, GaugeIcon, PaletteIcon, PencilIcon, ShapesIcon, TextIcon, ToggleRightIcon, Trash2Icon, TypeIcon } from "lucide-react";
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
  DetailSkeleton,
  DetailSection,
  LucideIconByName,
} from "@/components/admin/detail";
import { BADGES_TABLE, COLLECTIONS, type PocBadge } from "./poc-order";
import { loadPocBadge, savePocBadge, usePocVersion } from "./poc-store";

const RULES: Record<PocBadge["collection"], string> = {
  distance:
    "Obtenu dès que le cumul des activités synchronisées atteint la distance du badge, toutes disciplines confondues. Les activités privées comptent, les activités supprimées sur Strava sont retirées du cumul à la synchronisation suivante, ce qui peut retirer le badge.",
  tiles:
    "Obtenu dès que l'ensemble des tuiles visitées contient un carré plein de la taille du badge. Une tuile compte dès qu'une trace la traverse, même brièvement ; les tuiles de zoom 17 ne comptent pas pour ce badge.",
  stations:
    "Obtenu dès que le nombre de gares traversées atteint le seuil du badge. Une gare compte quand une trace passe à moins de cinquante mètres de son bâtiment ou de ses quais, quel que soit le mode de transport de l'activité.",
};

/** The badge loaded by the panel, its skeleton meanwhile; loaded again once saved. */
export function PocBadgePanel({ id }: { id: string }) {
  const version = usePocVersion();
  return (
    <DetailLoader id={id} load={loadPocBadge} refreshKey={version} skeleton={<DetailSkeleton cover sections={[5, 2, 5]} />}>
      {(badge) => <PocBadgeDetail badge={badge} />}
    </DetailLoader>
  );
}

/**
 * What the detail panel shows of a fake badge: its picture large as the
 * cover, then small as a field, a field of every kind edited in place, and
 * its buttons kept at the bottom.
 */
export function PocBadgeDetail({ badge }: { badge: PocBadge }) {
  const save = (patch: Parameters<typeof savePocBadge>[1]) => savePocBadge(badge.id, patch);
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
          <DetailField label="Nom" icon={<TypeIcon />} copy={badge.name} edit={{ value: badge.name, onSave: (name) => save({ name }) }} />
        </DetailFields>
        {/* Drawn by its column, picked in a list. */}
        <DetailColumnFields
          row={badge}
          columns={BADGES_TABLE.columns}
          ids={[
            "picture",
            "collection",
            "holders",
            "createdAt",
          ]}
        />
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
          {/* Refused below 1, cleared refused by the store. */}
          <DetailField
            label="Seuil"
            icon={<GaugeIcon />}
            edit={{ kind: "number", value: badge.threshold, min: 1, unit: COLLECTIONS[badge.collection].unit, onSave: (threshold) => save({ threshold }) }}
          />
          {/* Saved as soon as switched. */}
          <DetailField label="Actif" icon={<ToggleRightIcon />} edit={{ kind: "switch", value: badge.active, onSave: (active) => save({ active }) }} />
          <DetailField label="Disponible dès" icon={<CalendarIcon />} edit={{ kind: "date", value: badge.availableFrom, onSave: (availableFrom) => save({ availableFrom }) }} />
          <DetailField label="Fin" icon={<CalendarClockIcon />} edit={{
              kind: "date",
              time: true,
              value: badge.endsAt,
              // Hangs on another field: refused before the call, in a bubble.
              validate: (endsAt) => (endsAt && badge.availableFrom && endsAt.slice(0, 10) < badge.availableFrom ? "La fin doit suivre « Disponible dès »." : null),
              onSave: (endsAt) => save({ endsAt }),
            }}
          />
          <DetailField label="Condition" icon={<TextIcon />} copy={RULES[badge.collection]} stacked>
            {RULES[badge.collection]}
          </DetailField>
        </DetailFields>
      </DetailSection>
      {/* Kept at the bottom of the panel as the detail scrolls. */}
      <DetailActions sticky>
        <DetailAction label="Modifier" icon={<PencilIcon aria-hidden />} variant="default" onClick={() => toast(`Ouvrirait la modification de ${badge.name}`)} />
        <DetailAction label="Dupliquer" icon={<CopyIcon aria-hidden />} onClick={() => toast(`Ouvrirait la copie de ${badge.name}`)} />
        <DetailAction label="Supprimer" icon={<Trash2Icon aria-hidden />} variant="destructive" onClick={() => toast(`Ouvrirait la suppression de ${badge.name}`)} />
      </DetailActions>
    </>
  );
}
