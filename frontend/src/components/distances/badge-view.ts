import { useSyncExternalStore } from "react";
import type { DistanceBadge } from "@/lib/api/types";

/** Layout of the badges: cards with their details, or compact medals. */
export type BadgeView = "cards" | "compact";
export const BADGE_VIEWS: BadgeView[] = ["cards", "compact"];

/** Orders of the badges within their family; `default` is the one of the catalog. */
export type BadgeSort = "default" | "closest" | "progress" | "distance";
export const BADGE_SORTS: BadgeSort[] = ["default", "closest", "progress", "distance"];

const STORAGE_KEY = "distances-view";
const DEFAULT_VIEW: BadgeView = "cards";

let view: BadgeView | null = null;
const listeners = new Set<() => void>();

/** The view kept by the browser, the default one without any or when storage is blocked. */
function load(): BadgeView {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return BADGE_VIEWS.find((candidate) => candidate === stored) ?? DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

function badgeView(): BadgeView {
  view ??= load();
  return view;
}

/** Changes the layout of the badges and keeps it in the browser. */
export function setBadgeView(next: BadgeView): void {
  view = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not kept: the view still applies until the page is closed.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBadgeView(): BadgeView {
  return useSyncExternalStore(subscribe, badgeView, () => DEFAULT_VIEW);
}

/** Distance left before the current iteration of a badge is complete, in meters. */
export const remainingM = (badge: DistanceBadge) => (1 - badge.progress) * badge.distanceM;

const COMPARATORS: Record<Exclude<BadgeSort, "default">, (a: DistanceBadge, b: DistanceBadge) => number> = {
  closest: (a, b) => remainingM(a) - remainingM(b),
  progress: (a, b) => b.progress - a.progress,
  distance: (a, b) => a.distanceM - b.distanceM,
};

/** Badges in the given order; the catalog one is kept for ties. */
export function sortBadges(badges: DistanceBadge[], sort: BadgeSort): DistanceBadge[] {
  return sort === "default" ? badges : badges.toSorted(COMPARATORS[sort]);
}

/**
 * Badges closest to being unlocked, the closest first: those never obtained,
 * or once all are, the next iteration of every badge.
 */
export function nextBadges(badges: DistanceBadge[], count: number): DistanceBadge[] {
  const locked = badges.filter((badge) => badge.completions === 0);
  return sortBadges(locked.length > 0 ? locked : badges, "closest").slice(0, count);
}

/** Badges last added to the catalog, the latest first; among those added together, the last ones of the catalog. */
export function latestBadges(badges: DistanceBadge[], count: number): DistanceBadge[] {
  return badges
    .map((badge, position) => ({ badge, position, addedAt: Date.parse(badge.addedAt) }))
    .sort((a, b) => b.addedAt - a.addedAt || b.position - a.position)
    .slice(0, count)
    .map(({ badge }) => badge);
}
