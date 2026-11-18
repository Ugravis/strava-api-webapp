/**
 * Pages of the back office that its client components link to. The routes
 * live in `@/lib/admin/navigation`, server-only: kept in step with them.
 */

/** A station or a region (its code) opened on the map of the dataset, in its side panel. */
export const datasetMapHref = (id: string): string => `/map?row=${encodeURIComponent(id)}`;

/** A station opened in the side panel of the stations page. */
export const stationPanelHref = (id: string): string => `/stations?row=${encodeURIComponent(id)}`;

/** A region opened in the side panel of the regions page. */
export const regionPanelHref = (code: string): string => `/regions?row=${encodeURIComponent(code)}`;
