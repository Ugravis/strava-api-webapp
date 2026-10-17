import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MAP_PALETTES, type MapPalette } from "./map-style";

type ColorKey = { [K in keyof MapPalette]: MapPalette[K] extends string ? K : never }[keyof MapPalette];

/**
 * Colors of both themes as CSS variables, `--key` in light and `--key-dark`
 * in dark: the keys follow the theme in CSS, the same on the server and in
 * the browser.
 */
function themed(keys: Partial<Record<string, ColorKey>>): CSSProperties {
  const style: Record<string, string> = {};
  for (const [name, key] of Object.entries(keys)) {
    if (!key) continue;
    style[`--${name}`] = MAP_PALETTES.light[key];
    style[`--${name}-dark`] = MAP_PALETTES.dark[key];
  }
  return style as CSSProperties;
}

const SWATCH = "inline-block size-3 shrink-0 rounded-[3px]";

/** Visited tiles: the light large tiles with their outline, or the deeper small tiles. */
export function TileKey({
  subtiles = false,
  className,
  children,
}: {
  subtiles?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      aria-hidden
      style={themed(subtiles ? { fill: "subtile", line: "subtile" } : { fill: "tile", line: "tileOutline" })}
      className={cn(
        SWATCH,
        "border border-(--line) dark:border-(--line-dark)",
        subtiles ? "bg-(--fill)/60 dark:bg-(--fill-dark)/60" : "bg-(--fill)/35 dark:bg-(--fill-dark)/35",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Largest cluster: quiet over the large tiles, prominent over the small ones; a faint edge keeps it visible on the band. */
export function ClusterKey({ subtiles = false, className }: { subtiles?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      style={themed({ fill: subtiles ? "subtileCluster" : "cluster" })}
      className={cn(SWATCH, "border border-foreground/15 bg-(--fill)/55 dark:bg-(--fill-dark)/65", className)}
    />
  );
}

/**
 * Other clusters: a light wash over the large tiles, whose look it takes
 * with their outline, or small tiles a little deeper than the others.
 */
export function OtherClusterKey({ subtiles = false, className }: { subtiles?: boolean; className?: string }) {
  if (subtiles) {
    return (
      <span
        aria-hidden
        style={themed({ fill: "otherSubtileClusters" })}
        className={cn(SWATCH, "border border-foreground/15 bg-(--fill)/60 dark:bg-(--fill-dark)/60", className)}
      />
    );
  }
  return (
    <TileKey className={cn("relative overflow-hidden", className)}>
      <span
        style={themed({ wash: "otherClusters" })}
        className="absolute inset-0 bg-(--wash)/45 dark:bg-(--wash-dark)/55"
      />
    </TileKey>
  );
}

/** Largest square: its outline. */
export function SquareKey({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      style={themed({ line: "square" })}
      className={cn(SWATCH, "border-2 border-(--line) dark:border-(--line-dark)", className)}
    />
  );
}

/** Tracks: a raspberry line over its thin dark edge. */
export function TrackKey({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      style={themed({ line: "track", edge: "trackCasing" })}
      className={cn(
        "inline-block h-1.5 w-3 shrink-0 rounded-full border border-(--edge) bg-(--line) dark:border-(--edge-dark) dark:bg-(--line-dark)",
        className,
      )}
    />
  );
}
