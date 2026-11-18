/** Tiles of the maps of the back office, relayed by `/map-tiles` with the session. Absolute: MapLibre fetches them from its worker. */
export const adminTilesUrl = (source: "stations" | "countries", version: string, everyDot = false) =>
  `${window.location.origin}/map-tiles/${source}/{z}/{x}/{y}?v=${encodeURIComponent(version)}${everyDot ? "&dots=all" : ""}`;
