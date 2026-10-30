"use client";

import {
  ADMIN_BADGE_DESCRIPTION_MAX_LENGTH,
  ADMIN_BADGE_FAMILIES,
  ADMIN_BADGE_ID_MAX_LENGTH,
  ADMIN_BADGE_METRICS,
  ADMIN_BADGE_NAME_MAX_LENGTH,
  ADMIN_BADGE_THEME_ID_MAX_LENGTH,
  ADMIN_BADGE_THEME_NAME_MAX_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminBadge,
  type AdminBadgeFamily,
  type AdminBadgeMetric,
  type AdminBadgeTheme,
} from "@kilotrace/shared/admin";
import { ActionDialog, type ActionDialogProps } from "@/components/admin/action-dialog";
import { FormDialog, type FormField } from "@/components/admin/form-dialog";
import type { Tone } from "@/components/admin/data-table";
import { BADGE_ICON_KEYS, BadgeIcon } from "@/components/distances/badge-icon";
import { createBadge, createTheme, deleteBadge, deleteTheme, updateBadge, updateTheme } from "./actions";
import { shownAmount } from "./units";

/** What the permissions of the current member allow on the catalog. */
export interface BadgeRights {
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export const METRICS: Record<AdminBadgeMetric, { label: string; unit: string; tone: Tone }> = {
  distance: { label: "Distance", unit: "km", tone: "blue" },
  time: { label: "Durée", unit: "h", tone: "violet" },
  elevation: { label: "Dénivelé", unit: "m", tone: "amber" },
  activities: { label: "Activités", unit: "activités", tone: "green" },
  active_days: { label: "Jours actifs", unit: "jours", tone: "cyan" },
  tiles: { label: "Tuiles", unit: "tuiles", tone: "fuchsia" },
  subtiles: { label: "Petites tuiles", unit: "petites tuiles", tone: "fuchsia" },
  stations: { label: "Gares", unit: "gares", tone: "sky" },
};

export const FAMILIES: Record<AdminBadgeFamily, string> = {
  all: "Tous sports",
  run: "Course à pied",
  hike: "Marche",
  ride: "Vélo",
  swim: "Natation",
};

/** Pattern of the slugs, for the browser; the backend checks it again. */
const SLUG_PATTERN = "[a-z0-9]+(_[a-z0-9]+)*";
const amount = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

/** What a badge asks, in the unit shown: `42,195 km`, or its tiers. */
export function goalOf(badge: AdminBadge): string {
  const { unit } = METRICS[badge.metric];
  const shown = (value: number) => amount.format(shownAmount(badge.metric, value));
  return badge.tiers ? `Paliers : ${badge.tiers.map(shown).join(" · ")} ${unit}` : `${shown(badge.target)} ${unit}`;
}

function reasonFor(presets: string[]): ActionDialogProps["reason"] {
  return {
    label: "Raison",
    placeholder: "Expliquez la décision, elle est consignée dans le journal.",
    hint: `Entre ${ADMIN_REASON_MIN_LENGTH} et ${ADMIN_REASON_MAX_LENGTH} caractères.`,
    presetsLabel: "Raisons fréquentes",
    presets,
    required: true,
    min: ADMIN_REASON_MIN_LENGTH,
    max: ADMIN_REASON_MAX_LENGTH,
  };
}

interface Controlled {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Creation of a badge, or edition of `badge`, every field in one dialog. */
export function BadgeFormDialog({ badge, themes, ...dialog }: Controlled & { badge: AdminBadge | null; themes: AdminBadgeTheme[] }) {
  const metric = badge?.metric ?? "distance";
  const fields: FormField[] = [
    {
      kind: "text",
      name: "id",
      label: "Identifiant",
      hint: badge ? undefined : "Minuscules, chiffres et _ ; définitif.",
      defaultValue: badge?.id,
      required: true,
      maxLength: ADMIN_BADGE_ID_MAX_LENGTH,
      pattern: SLUG_PATTERN,
      readOnly: Boolean(badge),
      half: true,
    },
    { kind: "text", name: "name", label: "Nom", defaultValue: badge?.name, required: true, maxLength: ADMIN_BADGE_NAME_MAX_LENGTH, half: true },
    { kind: "textarea", name: "description", label: "Description", defaultValue: badge?.description, required: true, maxLength: ADMIN_BADGE_DESCRIPTION_MAX_LENGTH },
    {
      kind: "select",
      name: "metric",
      label: "Mesure",
      defaultValue: metric,
      options: ADMIN_BADGE_METRICS.map((value) => ({ value, label: METRICS[value].label })),
      half: true,
    },
    {
      kind: "select",
      name: "family",
      label: "Sports",
      defaultValue: badge?.family ?? "all",
      options: ADMIN_BADGE_FAMILIES.map((value) => ({ value, label: FAMILIES[value] })),
      half: true,
    },
    {
      kind: "number",
      name: "target",
      label: "Objectif",
      hint: "Montant d'une itération : le badge est obtenu à chaque multiple.",
      defaultValue: badge ? String(shownAmount(metric, badge.target)) : undefined,
      required: true,
      unit: { field: "metric", byValue: Object.fromEntries(ADMIN_BADGE_METRICS.map((value) => [value, METRICS[value].unit])) },
      half: true,
    },
    {
      kind: "text",
      name: "tiers",
      label: "Paliers",
      hint: "Facultatif, séparés par des espaces : le badge devient un défi obtenu une seule fois, son objectif est le dernier palier.",
      defaultValue: badge?.tiers?.map((tier) => String(shownAmount(metric, tier))).join(" "),
      half: true,
    },
    {
      kind: "select",
      name: "themeId",
      label: "Collection",
      defaultValue: badge?.themeId ?? "",
      options: [{ value: "", label: "Aucune" }, ...themes.map((theme) => ({ value: theme.id, label: theme.name }))],
      half: true,
    },
    { kind: "color", name: "backgroundColor", label: "Couleur de fond", noneLabel: "Fond par défaut", defaultValue: badge?.backgroundColor ?? null, half: true },
    {
      kind: "icons",
      name: "icon",
      label: "Icône",
      defaultValue: badge?.icon ?? BADGE_ICON_KEYS[0],
      options: BADGE_ICON_KEYS.map((value) => ({ value, label: value, icon: <BadgeIcon icon={value} /> })),
    },
  ];
  return (
    <FormDialog
      {...dialog}
      // Remounted per badge, so that the fields start from its values.
      key={badge?.id ?? "new"}
      action={badge ? updateBadge.bind(null, badge.id) : createBadge}
      title={badge ? `Modifier ${badge.name}` : "Nouveau badge"}
      description={badge ? "Progression et obtentions sont recalculées pour tous les utilisateurs." : "Actif dès sa création, ajouté en fin de catalogue."}
      submitLabel={badge ? "Enregistrer" : "Créer"}
      cancelLabel="Annuler"
      fields={fields}
    />
  );
}

/** Deletion of `badge`, its id typed again to confirm. */
export function DeleteBadgeDialog({ badge, ...dialog }: Controlled & { badge: AdminBadge | null }) {
  const id = badge?.id ?? "";
  return (
    <ActionDialog
      {...dialog}
      action={deleteBadge.bind(null, id)}
      title={`Supprimer ${badge?.name ?? ""} ?`}
      description="Définitif : le badge disparaît, ainsi que des favoris et des profils. Pour le masquer sans le perdre, désactivez-le."
      submitLabel="Supprimer"
      cancelLabel="Annuler"
      destructive
      reason={reasonFor(["Badge obsolète", "Doublon", "Créé par erreur"])}
      confirmation={{ label: `Tapez ${id} pour confirmer`, expected: id }}
    />
  );
}

/** Creation of a collection, or renaming of `theme`. */
export function ThemeFormDialog({ theme, ...dialog }: Controlled & { theme: AdminBadgeTheme | null }) {
  return (
    <FormDialog
      {...dialog}
      key={theme?.id ?? "new"}
      action={theme ? updateTheme.bind(null, theme.id) : createTheme}
      title={theme ? "Renommer la collection" : "Nouvelle collection"}
      description={theme ? "L'identifiant ne change pas." : "Elle apparaît sur la page Succès dès qu'un badge actif en fait partie."}
      submitLabel={theme ? "Enregistrer" : "Créer"}
      cancelLabel="Annuler"
      fields={[
        {
          kind: "text",
          name: "id",
          label: "Identifiant",
          hint: theme ? undefined : "Minuscules, chiffres et _ ; définitif.",
          defaultValue: theme?.id,
          required: true,
          maxLength: ADMIN_BADGE_THEME_ID_MAX_LENGTH,
          pattern: SLUG_PATTERN,
          readOnly: Boolean(theme),
          half: true,
        },
        { kind: "text", name: "name", label: "Nom", defaultValue: theme?.name, required: true, maxLength: ADMIN_BADGE_THEME_NAME_MAX_LENGTH, half: true },
      ]}
    />
  );
}

export function DeleteThemeDialog({ theme, ...dialog }: Controlled & { theme: AdminBadgeTheme | null }) {
  return (
    <ActionDialog
      {...dialog}
      action={deleteTheme.bind(null, theme?.id ?? "")}
      title={`Supprimer la collection ${theme?.name ?? ""} ?`}
      description="Ses badges restent, sans collection."
      submitLabel="Supprimer"
      cancelLabel="Annuler"
      destructive
      reason={reasonFor(["Collection abandonnée", "Fusionnée avec une autre", "Créée par erreur"])}
    />
  );
}
