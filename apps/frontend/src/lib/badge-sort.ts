import type { BadgeBackground, DistanceBadge } from "@/lib/api/types";

/** Orders of the badges of the sections, the catalog one first. */
export const BADGE_SORTS = ["default", "name_asc", "name_desc", "progress_asc", "progress_desc"] as const;

export type BadgeSort = (typeof BADGE_SORTS)[number];

/** The badges in the order picked, a copy; ties keep the catalog order. */
export function sortBadges(badges: readonly DistanceBadge[], sort: BadgeSort, locale: string): DistanceBadge[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const sorted = [...badges];
  switch (sort) {
    case "name_asc":
      return sorted.sort((a, b) => collator.compare(a.name, b.name));
    case "name_desc":
      return sorted.sort((a, b) => collator.compare(b.name, a.name));
    case "progress_asc":
      return sorted.sort((a, b) => a.progress - b.progress);
    case "progress_desc":
      return sorted.sort((a, b) => b.progress - a.progress);
    default:
      return sorted;
  }
}

/** The badges still in progress closest to their next completion, at most `count`. */
export function closestBadges(badges: readonly DistanceBadge[], count: number): DistanceBadge[] {
  return badges
    .filter((badge) => badge.progress < 1)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, count);
}

/** The badges the latest added to the catalog, at most `count`; among those added together, the last ones first. */
export function recentBadges(badges: readonly DistanceBadge[], count: number): DistanceBadge[] {
  return badges
    .map((badge, index) => ({ badge, index }))
    .sort((a, b) => Date.parse(b.badge.addedAt) - Date.parse(a.badge.addedAt) || b.index - a.index)
    .map(({ badge }) => badge)
    .slice(0, count);
}

/** Relative luminance of a `#rrggbb` color, in [0, 1]. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Whether the text on a background reads better light: images and dark colors. */
export function lightTextOn(background: BadgeBackground): boolean {
  // Above 0.179, black text contrasts more than white text.
  return background.kind === "image" || luminance(background.color) <= 0.179;
}
