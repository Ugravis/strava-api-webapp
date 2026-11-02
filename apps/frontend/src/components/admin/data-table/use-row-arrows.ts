import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { DataTableConfig } from "./types";
import type { DataTableState } from "./use-data-table";

/** Rest of the arrows, pressed in a row or held down, after which the row reached opens. */
const ARROW_REST = 150;

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
  // A click wins over a row still waiting.
  const openRow = useMemo(
    () =>
      onOpen &&
      ((row: T) => {
        cancel();
        setCursor(null);
        onOpen(row);
      }),
    [onOpen],
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
      setCursor(config.rowId(next));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, openRow, loading, entries, config, result, state]);
  // The active row kept in sight as the arrows move it.
  useEffect(() => {
    if (active === null) return;
    box.current?.querySelector(`[data-row-id="${CSS.escape(active)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, result]);

  return { active, openRow, box };
}
