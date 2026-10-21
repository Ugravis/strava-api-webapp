"use client";

import { useSyncExternalStore } from "react";

/** Tailwind breakpoints reached by the viewport, `base` below `sm`. */
export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

/** Widest first, as matched. */
const QUERIES: [Exclude<Breakpoint, "base">, string][] = [
  ["xl", "(min-width: 1280px)"],
  ["lg", "(min-width: 1024px)"],
  ["md", "(min-width: 768px)"],
  ["sm", "(min-width: 640px)"],
];

function subscribe(onChange: () => void) {
  const lists = QUERIES.map(([, query]) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

function breakpoint(): Breakpoint {
  return QUERIES.find(([, query]) => window.matchMedia(query).matches)?.[0] ?? "base";
}

/** Widest Tailwind breakpoint reached at the current width, e.g. to match the columns of a grid. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, breakpoint, () => "base");
}
