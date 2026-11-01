"use client";

import { CopyIcon, MedalIcon, PencilIcon, TextIcon, Trash2Icon, TypeIcon } from "lucide-react";
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
  DetailSkeleton,
  DetailSection,
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
    <DetailLoader id={id} load={loadPocBadge} refreshKey={version} skeleton={<DetailSkeleton cover sections={[4, 1]} />}>
      {(badge) => <PocBadgeDetail badge={badge} />}
    </DetailLoader>
  );
}

/** What the detail panel shows of a fake badge: its picture large as the cover, then small as a field, and its buttons kept at the bottom. */
export function PocBadgeDetail({ badge }: { badge: PocBadge }) {
  return (
    <>
      <DetailCover image={badge.picture} />
      <DetailHeader
        media={
          <span className="flex size-12 items-center justify-center rounded-full bg-muted [&_svg]:size-6">
            <MedalIcon aria-hidden />
          </span>
        }
        title={badge.name}
        subtitle={COLLECTIONS[badge.collection].label}
      />
      <DetailSection title="Badge">
        <DetailFields>
          <DetailField label="Nom" icon={<TypeIcon />} copy={badge.name} edit={{ value: badge.name, onSave: (name) => savePocBadge(badge.id, { name }) }} />
        </DetailFields>
        <DetailColumnFields row={badge} columns={BADGES_TABLE.columns} ids={["picture", "collection", "holders", "createdAt"]} />
      </DetailSection>
      <DetailSection title="Règle">
        <DetailFields>
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
