import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { DataTableConfig } from "./types";
import type { DataTableState } from "./use-data-table";

/** Rest of the arrows, pressed in a row or held down, after which the row reached opens. */
const ARROW_REST = 150;

/** The nearest box scrolling `element` up and down, the page when none. */
function scrollerOf(element: Element): Element {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** The top and bottom of what `scroller` shows on the screen. */
function viewOf(scroller: Element) {
  if (scroller === document.scrollingElement || scroller === document.documentElement) return { top: 0, bottom: window.innerHeight };
  const { top, bottom } = scroller.getBoundingClientRect();
  return { top, bottom };
}

/**
 * Brings `row` to the middle of the screen as far as it can, with the page
 * and the box of its rows (a table scrolling within its height). The page
 * never scrolls past the bottom of `table`, so that what lies under it (the
 * pagination, the end of the page) does not come up for the row: down, the
 * page moves first, bringing the table into sight, the box the rest; up,
 * the box first, the page the rest.
 */
function centreRow(row: Element, table: Element) {
  const { top, bottom } = row.getBoundingClientRect();
  const delta = (top + bottom) / 2 - window.innerHeight / 2;
  const page = scrollerOf(table);
  const scroller = scrollerOf(row);
  const inner = scroller !== page && table.contains(scroller) ? scroller : null;
  /** What the box can move by, toward `wanted`. */
  const innerBy = (wanted: number) => (inner ? Math.min(Math.max(wanted, -inner.scrollTop), inner.scrollHeight - inner.clientHeight - inner.scrollTop) : 0);
  let pageBy: number;
  let boxBy: number;
  if (delta > 0) {
    pageBy = Math.min(delta, Math.max(0, table.getBoundingClientRect().bottom - viewOf(page).bottom));
    boxBy = innerBy(delta - pageBy);
  } else {
    boxBy = innerBy(delta);
    pageBy = delta - boxBy;
  }
  if (inner && Math.abs(boxBy) >= 1) inner.scrollBy({ top: boxBy, behavior: "smooth" });
  if (Math.abs(pageBy) >= 1) page.scrollBy({ top: pageBy, behavior: "smooth" });
}

/*
 * Pressed in a row, quickly or held down, the arrows only move the
 * highlight, cheap on memoized rows: the row opens once they rest, so that
 * neither the content of the panel nor the URL, which renders the table
 * again, follow each step. A lone press opens at once.
 */
export function useRowArrows<T>({
  config,
  state,
  entries,
  activeRowId,
  onOpen,
}: {
  config: DataTableConfig<T>;
  state: DataTableState<T>;
  entries: NonNullable<DataTableState<T>["result"]>["entries"];
  activeRowId: string | null;
  onOpen: ((row: T) => void) | undefined;
}) {
  const { loading, result } = state;
  const [cursor, setCursor] = useState<string | null>(null);
  if (cursor !== null && cursor === activeRowId) setCursor(null);
  const active = cursor ?? activeRowId;
  const pending = useRef<{ row: T; timer: ReturnType<typeof setTimeout> } | null>(null);
  const lastPress = useRef(0);
  const cancel = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  };
  const flush = useEffectEvent(() => {
    const row = pending.current?.row;
    cancel();
    if (row) onOpen?.(row);
  });
  // The row this table opened (a click, the arrows): kept in sight, never centred.
  const own = useRef<string | null>(null);
  // A click wins over a row still waiting.
  const openRow = useMemo(
    () =>
      onOpen &&
      ((row: T) => {
        cancel();
        setCursor(null);
        own.current = config.rowId(row);
        onOpen(row);
      }),
    [onOpen, config],
  );
  useEffect(() => cancel, []);

  // Past the last row of the page, the next one, opened on its first row; before the first, the previous one, on its last.
  const edge = useRef<"first" | "last" | null>(null);
  useEffect(() => {
    if (loading || !edge.current || !openRow) return;
    const rows = entries.flatMap((entry) => ("row" in entry ? [entry.row] : []));
    const row = edge.current === "first" ? rows[0] : rows.at(-1);
    edge.current = null;
    if (row) openRow(row);
  }, [loading, entries, openRow]);

  // Up and down from the active row, to the next one shown: left to a field or a menu that handles them.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active === null || !openRow || loading) return;
    const rows = entries.flatMap((entry) => ("row" in entry ? [entry.row] : []));
    const at = rows.findIndex((row) => config.rowId(row) === active);
    if (at === -1) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=true], [role=menu], [role=listbox], [role=dialog]")) return;
      const down = event.key === "ArrowDown";
      const next = rows[at + (down ? 1 : -1)];
      if (!next) {
        const page = result?.page ?? 1;
        if (!result || (down ? page >= result.pages : page <= 1)) return;
        event.preventDefault();
        cancel();
        edge.current = down ? "first" : "last";
        state.setPage(page + (down ? 1 : -1));
        return;
      }
      event.preventDefault();
      const lone = event.timeStamp - lastPress.current > ARROW_REST;
      lastPress.current = event.timeStamp;
      if (lone && !pending.current) return openRow(next);
      cancel();
      pending.current = { row: next, timer: setTimeout(flush, ARROW_REST) };
      own.current = config.rowId(next);
      setCursor(config.rowId(next));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, openRow, loading, entries, config, result, state]);
  /*
   * The active row kept in sight as the arrows move it. Opened from
   * elsewhere (a link of the panel, back and forward, a shared link), it is
   * centred once, as soon as it is drawn.
   */
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (active === null) return;
    const row = box.current?.querySelector(`[data-row-id="${CSS.escape(active)}"]`);
    if (!row || !box.current) return;
    if (active !== own.current) own.current = null;
    if (active === handled.current || own.current) row.scrollIntoView({ block: "nearest" });
    else centreRow(row, box.current);
    handled.current = active;
  }, [active, result]);

  return { active, openRow, box };
}
