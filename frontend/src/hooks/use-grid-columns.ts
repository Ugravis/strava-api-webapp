"use client";

import { useSyncExternalStore } from "react";

/** Columns of the badge grids: 3 on phones, 4 from `sm`, 6 from `md`, as their Tailwind classes. */
export type GridColumns = 3 | 4 | 6;

const QUERIES = { md: "(min-width: 768px)", sm: "(min-width: 640px)" } as const;

function subscribe(onChange: () => void) {
  const lists = Object.values(QUERIES).map((query) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

function columns(): GridColumns {
  if (window.matchMedia(QUERIES.md).matches) return 6;
  return window.matchMedia(QUERIES.sm).matches ? 4 : 3;
}

/** Number of columns the badge grids have at the current width. */
export function useGridColumns(): GridColumns {
  return useSyncExternalStore(subscribe, columns, () => 3);
}
