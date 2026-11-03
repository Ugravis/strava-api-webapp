"use client";

import {
  PAGE_VIEW_DURATION_MAX_MS,
  PAGE_VIEW_PATH_MAX,
  PAGE_VIEW_QUERIES_MAX,
  PAGE_VIEW_QUERY_MAX,
  type PageViewBeacon,
  type PageViewDevice,
} from "@kilotrace/shared";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const ENDPOINT = "/api/page-views";
/** Shorter views are not pages seen: a redirect, a background tab, the double effect of strict mode. */
const MIN_VISIBLE_MS = 500;

/** A segment that identifies a row, replaced so that a route is counted as one page. */
const ID_SEGMENT = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * How often the query string is read: the map writes it with
 * `history.replaceState` and the state of Next.js, which `useSearchParams`
 * does not follow.
 */
const QUERY_POLL_MS = 1000;

/** The current query string, normalized, cut to the longest recorded. */
const currentQuery = () => new URLSearchParams(window.location.search).toString().slice(0, PAGE_VIEW_QUERY_MAX);

const routeOf = (pathname: string) =>
  pathname
    .split("/")
    .map((segment) => (ID_SEGMENT.test(segment) ? "[id]" : segment))
    .join("/")
    .slice(0, PAGE_VIEW_PATH_MAX);

function deviceOf(): PageViewDevice {
  if (!window.matchMedia("(pointer: coarse)").matches) {
    return "desktop";
  }
  return Math.min(window.screen.width, window.screen.height) < 600 ? "mobile" : "tablet";
}

interface View {
  id: string;
  path: string;
  device: PageViewDevice;
  /** Visible time of each query string the page had. */
  queries: Map<string, number>;
  query: string;
  /** Since when the page is visible with its current query string; null while hidden. */
  visibleSince: number | null;
}

/** Adds the time visible so far to the current query string. */
function settle(view: View) {
  if (view.visibleSince === null) {
    return;
  }
  const now = performance.now();
  view.queries.set(view.query, (view.queries.get(view.query) ?? 0) + now - view.visibleSince);
  view.visibleSince = now;
}

/** Gives the time so far to the former query string, if it changed. */
function follow(view: View) {
  const query = currentQuery();
  if (query === view.query) {
    return;
  }
  settle(view);
  view.query = query;
  view.queries.set(query, view.queries.get(query) ?? 0);
}

function send(view: View) {
  settle(view);
  const queries = [...view.queries].map(([query, ms]) => ({
    query,
    durationMs: Math.min(Math.round(ms), PAGE_VIEW_DURATION_MAX_MS),
  }));
  const durationMs = queries.reduce((sum, entry) => sum + entry.durationMs, 0);
  if (durationMs < MIN_VISIBLE_MS) {
    return;
  }
  const beacon: PageViewBeacon = {
    id: view.id,
    path: view.path,
    device: view.device,
    durationMs: Math.min(durationMs, PAGE_VIEW_DURATION_MAX_MS),
    // The longest ones first, should there be too many.
    queries: queries.sort((a, b) => b.durationMs - a.durationMs).slice(0, PAGE_VIEW_QUERIES_MAX),
  };
  navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(beacon)], { type: "application/json" }));
}

/**
 * Records the pages seen by the signed-in user, the query strings they had
 * (the tools of the map…) and their visible time, for the statistics of the
 * back office. A beacon goes each time the page is hidden or left; those of
 * one view share its id, the latest one wins.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const initial = currentQuery();
    const view: View = {
      id: crypto.randomUUID(),
      path: routeOf(pathname),
      device: deviceOf(),
      queries: new Map([[initial, 0]]),
      query: initial,
      visibleSince: document.visibilityState === "visible" ? performance.now() : null,
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        view.visibleSince = performance.now();
        return;
      }
      follow(view);
      send(view);
      view.visibleSince = null;
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    const timer = window.setInterval(() => follow(view), QUERY_POLL_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(timer);
      // Not followed: the address is already the one of the next page.
      send(view);
    };
  }, [pathname]);

  return null;
}
