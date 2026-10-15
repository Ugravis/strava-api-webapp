/** OpenFreeMap vector styles: OpenStreetMap data, no API key nor quota. */
const STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

export function mapStyleUrl(theme: string | undefined): string {
  return theme === "dark" ? STYLE_URLS.dark : STYLE_URLS.light;
}

/** Metropolitan France, shown until there is a track to frame. */
export const DEFAULT_VIEW = { center: [2.5, 46.6] as [number, number], zoom: 4.5 };

export const TRACK_COLOR = "#fc4c02";
/** Visited tiles, distinct from the tracks drawn over them. */
export const TILE_COLOR = "#7c3aed";
/** Grid of the unvisited tiles, readable on the light and dark styles. */
export const GRID_COLOR = "#64748b";
