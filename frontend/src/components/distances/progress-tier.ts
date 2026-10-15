export interface ProgressTier {
  /** Color of the progress ring. */
  stroke: string;
  /** Matching text color, readable in both themes. */
  text: string;
}

/** Color steps of a progress, from the start of an iteration to its end. */
const TIERS: ProgressTier[] = [
  { stroke: "stroke-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { stroke: "stroke-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { stroke: "stroke-amber-400", text: "text-amber-600 dark:text-amber-400" },
  { stroke: "stroke-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
];

/** Tier of a progress in [0, 1]: one per quarter. */
export function progressTier(value: number): ProgressTier {
  const index = Math.floor(Math.min(Math.max(value, 0), 1) * TIERS.length);
  return TIERS[Math.min(index, TIERS.length - 1)];
}
