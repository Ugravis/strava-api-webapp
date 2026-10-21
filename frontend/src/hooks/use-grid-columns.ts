"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

/** Columns of a CSS grid, as laid out by its classes. */
function columnsOf(element: HTMLElement): number {
  return getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length || 1;
}

/** Number of columns of the grid `ref` points to, kept up to date as its width changes; `fallback` before it is measured. */
export function useGridColumns(ref: RefObject<HTMLElement | null>, fallback: number): number {
  const [columns, setColumns] = useState(fallback);

  // Measured before paint: a folded grid shows its full rows at once.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setColumns(columnsOf(element));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return columns;
}
