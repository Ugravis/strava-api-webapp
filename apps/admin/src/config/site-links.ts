import { siteConfig } from "@kilotrace/ui/config/site";

/**
 * Pages of the public site, absolute: the back office runs on its own host.
 * Kept in step with the routes of apps/frontend (config/routes.ts).
 */
export const siteUrl = (path: string): string => new URL(path, siteConfig.url).toString();

export const siteHomeHref = siteUrl("/dashboard");

export const userProfileHref = (username: string): string => siteUrl(`/profiles?user=${encodeURIComponent(username)}`);

/** A station opened in the panel of the public map. */
export const stationMapHref = (id: string): string => siteUrl(`/map?station=${encodeURIComponent(id)}`);

/** A country opened with the sector tool of the public map. */
export const regionMapHref = (code: string): string => siteUrl(`/map?sector=${encodeURIComponent(code)}`);
