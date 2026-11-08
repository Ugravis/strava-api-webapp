"use client";

import {
  ADMIN_BADGE_FAMILIES,
  ADMIN_BADGE_METRICS,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminBadge,
  type AdminBadgeFamily,
  type AdminBadgeMetric,
  type AdminBadgeTheme,
  type UpdateBadgeRequest,
} from "@kilotrace/shared/admin";
import { toast } from "sonner";
import type { ConfirmOptions, Tone } from "@kilotrace/ui/components/admin/data-table";
import type { DetailEditOption } from "@kilotrace/ui/components/admin/detail";
import { createVersion } from "@/lib/admin/version";
import { deleteBadge, deleteTheme, saveBadge, setBadgeActive, setBadgesActive } from "./actions";
import { shownAmount } from "./units";

/** The version of the catalog: the `refreshKey` of both tables and of the details. */
export const { useVersion: useCatalogVersion, bump: bumpCatalog } = createVersion();

/** `?row=` of a collection: apart from the ids of the badges, which never hold a colon. */
export const THEME_ROW = "collection:";

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

export const FAMILIES: Record<AdminBadgeFamily, { label: string; tone: Tone }> = {
  all: { label: "Tous sports", tone: "gray" },
  run: { label: "Course à pied", tone: "red" },
  hike: { label: "Marche", tone: "green" },
  ride: { label: "Vélo", tone: "blue" },
  swim: { label: "Natation", tone: "cyan" },
};

const amount = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

/** What a badge asks, in the unit shown: `42,195 km`, or its tiers. */
export function goalOf(badge: AdminBadge): string {
  const { unit } = METRICS[badge.metric];
  const shown = (value: number) => amount.format(shownAmount(badge.metric, value));
  return badge.tiers ? `Paliers : ${badge.tiers.map(shown).join(" · ")} ${unit}` : `${shown(badge.target)} ${unit}`;
}

/** The options of the lists of a badge. */
export const METRIC_OPTIONS: DetailEditOption[] = ADMIN_BADGE_METRICS.map((value) => ({ value, label: METRICS[value].label, tone: METRICS[value].tone }));
export const FAMILY_OPTIONS: DetailEditOption[] = ADMIN_BADGE_FAMILIES.map((value) => ({ value, label: FAMILIES[value].label, tone: FAMILIES[value].tone }));
export const themeOptions = (themes: AdminBadgeTheme[]): DetailEditOption[] => themes.map((theme) => ({ value: theme.id, label: theme.name }));

/** The locks of the fields and buttons, for a member without the permission. */
export const LOCKS = {
  create: "Réservé aux membres qui créent les badges",
  edit: "Réservé aux membres qui modifient les badges",
  delete: "Réservé aux membres qui suppriment les badges",
};

/** Saves a change of a badge, every field sent as the backend replaces them all; the tables and the details fetch again. */
export async function saveBadgeWith(badge: AdminBadge, patch: Partial<UpdateBadgeRequest>) {
  const { metric, family, target, tiers, name, description, themeId, icon, backgroundColor } = badge;
  const result = await saveBadge(badge.id, { metric, family, target, tiers, name, description, themeId, icon, backgroundColor, ...patch });
  if (result.ok) bumpCatalog();
  return result;
}

/** Turns badges on or off, told by a toast; true once done. */
export async function toggleBadges(ids: string[], active: boolean): Promise<boolean> {
  const result = ids.length === 1 ? await setBadgeActive(ids[0], active) : await setBadgesActive(ids, active);
  if (!result.ok) {
    toast.error(result.message);
    return false;
  }
  toast.success(active ? "Activé" : "Désactivé");
  bumpCatalog();
  return true;
}

const reasonFor = (presets: string[]): ConfirmOptions["reason"] => ({
  label: "Raison",
  placeholder: "Expliquez la décision, elle est consignée dans le journal.",
  required: true,
  minLength: ADMIN_REASON_MIN_LENGTH,
  maxLength: ADMIN_REASON_MAX_LENGTH,
  presets,
});

type Removal = { confirm: ConfirmOptions; run: (reason: string | undefined) => Promise<unknown> };

/** The deletion of a badge, asked first with a reason and its id typed: by its detail or the menu of its row. `done` once deleted. */
export function deleteBadgeOf(badge: AdminBadge, done: () => void): Removal {
  return {
    confirm: {
      title: `Supprimer ${badge.name} ?`,
      description: "Définitif : le badge disparaît, ainsi que des favoris et des profils. Pour le masquer sans le perdre, désactivez-le.",
      confirmLabel: "Supprimer",
      reason: reasonFor(["Badge obsolète", "Doublon", "Créé par erreur"]),
      typed: { label: `Tapez ${badge.id} pour confirmer`, expected: badge.id },
    },
    run: async (reason) => {
      const result = await deleteBadge(badge.id, reason);
      if (result.ok) {
        bumpCatalog();
        done();
      }
      return result;
    },
  };
}

/** The same for a collection: its badges stay, without collection. */
export function deleteThemeOf(theme: AdminBadgeTheme, done: () => void): Removal {
  return {
    confirm: {
      title: `Supprimer la collection ${theme.name} ?`,
      description: "Ses badges restent, sans collection.",
      confirmLabel: "Supprimer",
      reason: reasonFor(["Collection abandonnée", "Fusionnée avec une autre", "Créée par erreur"]),
    },
    run: async (reason) => {
      const result = await deleteTheme(theme.id, reason);
      if (result.ok) {
        bumpCatalog();
        done();
      }
      return result;
    },
  };
}
