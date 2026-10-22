export interface ProgressTier {
  /** Color of the progress ring. */
  stroke: string;
  /** Color of a progress bar. */
  fill: string;
  /** Matching text color, readable in both themes. */
  text: string;
}

/** Color steps of a progress, each starting at `from` (share in [0, 1]), in increasing order. */
const TIERS: (ProgressTier & { from: number })[] = [
  { from: 0, stroke: "stroke-blue-500", fill: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  { from: 0.5, stroke: "stroke-amber-400", fill: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
  { from: 0.75, stroke: "stroke-emerald-500", fill: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
];

/** Tier of a progress in [0, 1]: the last one it has reached. */
export function progressTier(value: number): ProgressTier {
  return TIERS.findLast((tier) => value >= tier.from) ?? TIERS[0];
}
