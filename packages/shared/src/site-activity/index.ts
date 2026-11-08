/** Kinds of device a page is seen on, told by the browser. */
export const PAGE_VIEW_DEVICES = ["mobile", "tablet", "desktop"] as const;

export type PageViewDevice = (typeof PAGE_VIEW_DEVICES)[number];

/** Longest route recorded for a page view. */
export const PAGE_VIEW_PATH_MAX = 200;

/** Longest query string recorded, without its `?`. */
export const PAGE_VIEW_QUERY_MAX = 500;

/** Query strings recorded per page view at most. */
export const PAGE_VIEW_QUERIES_MAX = 50;

/** Longest visible time accepted for one page view: 12 hours. */
export const PAGE_VIEW_DURATION_MAX_MS = 12 * 60 * 60 * 1000;

/**
 * `POST /api/page-views`, sent with `sendBeacon` each time the page is
 * hidden or left. Every beacon of a view carries its id and its visible
 * time so far: the latest one wins.
 */
export interface PageViewBeacon {
  id: string;
  /** Route of the page, without its query string. */
  path: string;
  device: PageViewDevice;
  durationMs: number;
  /** Each query string the page had while visible, `""` for none, with its visible time. */
  queries: { query: string; durationMs: number }[];
}
