import * as React from "react";

const NO_HOVER_QUERY = "(hover: none)";

// One listener of the query for all the components reading it: a table has hundreds of cells.
const listeners = new Set<() => void>();
let query: MediaQueryList | null = null;

function subscribe(onChange: () => void) {
  if (!query) {
    query = window.matchMedia(NO_HOVER_QUERY);
    query.addEventListener("change", () => listeners.forEach((listener) => listener()));
  }
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** A screen without hover, a phone or a tablet: nothing shows on hover there. */
export function useNoHover() {
  return React.useSyncExternalStore(subscribe, () => (query ?? window.matchMedia(NO_HOVER_QUERY)).matches, () => false);
}
