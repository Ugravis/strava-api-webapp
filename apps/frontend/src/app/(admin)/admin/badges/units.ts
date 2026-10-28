import { ADMIN_BADGE_UNITS, type AdminBadgeMetric } from "@kilotrace/shared/admin";

/** Stored units per unit shown in the back office: kilometers for distances, hours for durations. */
export function scaleOf(metric: AdminBadgeMetric): number {
  if (metric === "distance") return 1000;
  return ADMIN_BADGE_UNITS[metric] === "s" ? 3600 : 1;
}

/** A stored amount in the unit shown, e.g. `42.195` for a marathon. */
export function shownAmount(metric: AdminBadgeMetric, amount: number): number {
  return Math.round((amount / scaleOf(metric)) * 1000) / 1000;
}
