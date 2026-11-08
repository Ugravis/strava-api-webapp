import { useLayoutEffect, useRef } from "react";

/**
 * The skeleton keeps the widths of the columns as they were, set on the cells
 * before paint: rebuilt on the bars alone, the table would shrink and jump.
 * The ref goes on the row of the header.
 */
export function useColumnWidths(loading: boolean, columns: unknown, result: unknown) {
  const head = useRef<HTMLTableRowElement>(null);
  const widths = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const cells = head.current?.querySelectorAll<HTMLElement>("th[data-column]") ?? [];
    for (const cell of cells) {
      const width = loading ? widths.current.get(cell.dataset.column!) : undefined;
      cell.style.minWidth = width ? `${width}px` : "";
    }
    if (!loading) {
      for (const cell of cells) widths.current.set(cell.dataset.column!, cell.getBoundingClientRect().width);
    }
  }, [loading, columns, result]);
  return head;
}
