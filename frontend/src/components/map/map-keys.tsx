import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { MAP_PALETTES, type MapPalette } from "./map-style";

/** A color of the map, in both themes. */
export type MapColor = { [K in keyof MapPalette]: MapPalette[K] extends string ? K : never }[keyof MapPalette];

/**
 * A color of the map as CSS variables, `--accent` in light and
 * `--accent-dark` in dark: it follows the theme in CSS, the same on the
 * server and in the browser.
 */
export function accentStyle(color: MapColor): CSSProperties {
  return { "--accent": MAP_PALETTES.light[color], "--accent-dark": MAP_PALETTES.dark[color] } as CSSProperties;
}

/** Background in the accent set by `accentStyle`. */
export const ACCENT_BG = "bg-(--accent) dark:bg-(--accent-dark)";

/**
 * Bar along a figure, in the color of what it counts on the map; a faint
 * edge keeps the palest colors visible on the band.
 */
export function AccentBar({ color, className }: { color: MapColor; className?: string }) {
  return (
    <span
      aria-hidden
      style={accentStyle(color)}
      className={cn("w-[3px] shrink-0 self-stretch rounded-full ring-1 ring-foreground/10", ACCENT_BG, className)}
    />
  );
}
