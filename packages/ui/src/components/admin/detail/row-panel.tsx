"use client";

import { type ReactNode, useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef } from "react";
import type { DataTableConfig } from "@kilotrace/ui/components/admin/data-table";
import { useSplitPanel } from "@kilotrace/ui/components/split-panel";

/*
 * A table and its rows opened in the split panel: the wiring every list of
 * the back office repeats, once.
 */

/** What the contents of the panel act on. */
export interface RowPanelControls {
  /** Opens the detail of the row `id`. */
  open: (id: string) => void;
  /** Opens the draft of a new row, filled from `initial` (a copy). */
  create: (initial?: object) => void;
  /** A row created from the draft: its detail in its place, the draft dropped from back and forward. */
  created: (id: string) => void;
  /** A row removed: the panel closes, or shows the next row of the table (`afterRemove`). */
  removed: (id: string) => void;
  /** A row whose id changed (e.g. a username renamed): shown under its new id when the panel showed it. */
  renamed: (from: string, to: string) => void;
  close: () => void;
}

export interface RowPanelOptions<T> {
  /** The config of the table, its `create` button added when `create` is given. Stable. */
  config: DataTableConfig<T>;
  /** The title of a row in the header of the panel. */
  title: (row: T) => string;
  /** The content of the row `id`: its `DetailLoader`. */
  detail: (id: string, panel: RowPanelControls) => ReactNode;
  /** Loads a row not on the page (a shared link, a row just created), for its title. */
  load?: (id: string) => Promise<T | null>;
  /**
   * The draft of a new row: `form` its `DetailForm`, `id` its `?row=` (e.g.
   * `new:badge`, never an id of a row), `label` the button of the table,
   * `title` the header of the panel, `copyTitle` the one of a copy.
   */
  create?: { id: string; label: string; title: string; copyTitle?: string; form: (panel: RowPanelControls & { initial?: object }) => ReactNode };
  /** After a removal: closed (default), or the next row shown, the previous one after the last. */
  afterRemove?: "close" | "next";
}

/**
 * Opens the rows of a table in the split panel: a click or the arrows, the
 * row of `?row=` on arrival (a shared link, the draft of a new row too),
 * the `create` button opening a draft, a row created shown in its place, a
 * row removed closing the panel or opening the next one. Spread `table` on
 * the `DataTable`, with its `refreshKey`.
 */
export function useRowPanel<T>(options: RowPanelOptions<T>) {
  const { config, create } = options;
  const { open, replace, close, setTitle, isOpen, activeId } = useSplitPanel();
  // The options of the last render, read by the controls, which stay stable.
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  // The rows shown, in order, for the next one after a removal and for the titles.
  const rows = useRef<T[]>([]);

  const controls = useMemo(() => {
    const show = (id: string, replacing: boolean) => {
      const { title, detail, load } = latest.current;
      const row = rows.current.find((each) => config.rowId(each) === id);
      // Opened at once on its skeleton, titled once loaded when not on the page.
      (replacing ? replace : open)(detail(id, controls), { id, title: row ? title(row) : "Détail" });
      if (!row) void load?.(id).then((found) => found && setTitle(id, title(found)));
    };
    const controls: RowPanelControls = {
      open: (id) => show(id, false),
      create: (initial) => {
        const blank = latest.current.create;
        if (blank) open(blank.form({ ...controls, initial }), { id: blank.id, title: initial ? (blank.copyTitle ?? blank.title) : blank.title });
      },
      created: (id) => show(id, true),
      removed: (id) => {
        const at = rows.current.findIndex((row) => config.rowId(row) === id);
        const next = latest.current.afterRemove === "next" && at !== -1 ? (rows.current[at + 1] ?? rows.current[at - 1]) : undefined;
        if (next) show(config.rowId(next), true);
        else close();
      },
      renamed: (from, to) => {
        // The URL itself: right after a draft is created, the search params read by the page may still name the draft.
        if (new URLSearchParams(window.location.search).get("row") === from) show(to, true);
      },
      close,
    };
    return controls;
  }, [open, replace, close, setTitle, config]);

  // A shared link: the row of `?row=` (once found, when it can be loaded), or a blank draft, once on arrival.
  const arrive = useEffectEvent(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (!id) return;
    const { load } = latest.current;
    if (id === create?.id) controls.create();
    else if (!load) controls.open(id);
    else void load(id).then((row) => row && controls.open(id));
  });
  useEffect(() => arrive(), []);

  const onRowClick = useCallback((row: T) => controls.open(config.rowId(row)), [controls, config]);
  const onRows = useCallback((shown: T[]) => void (rows.current = shown), []);
  const label = create?.label;
  const withCreate = useMemo(() => (label ? { ...config, create: { label, onClick: () => controls.create() } } : config), [config, label, controls]);

  return {
    /** Spread on the `DataTable`. */
    table: { config: withCreate, onRowClick, onRows, activeRowId: isOpen ? activeId : null },
    ...controls,
  };
}
