"use client";

import { TABLE_DEFAULT_SORT, TABLE_PAGE_SIZE, type TableEntry, type TablePage, type TableQuery, type TableSort } from "@kilotrace/shared/table";
import { arrayMove } from "@dnd-kit/sortable";
import { Grid2x2Icon, LayoutGridIcon, TableIcon, TextAlignStartIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { DataTableConfig, DataTableLayout, DataTablePicks, DataTableView } from "./types";
import { usePhone, useTableParams, writeTableParams } from "./use-table-params";

const SEARCH_DELAY = 250;

/** Up to this number of columns, a table shows as a small grid in the menu of the views. */
const FEW_COLUMNS = 5;

/** The icon of a view, told by its layout, and for a table by its number of columns. */
export function viewIcon<T>(view: DataTableView, config: DataTableConfig<T>): ReactNode {
  const layout = view.layout ?? "table";
  if (layout === "cards") return <LayoutGridIcon />;
  if (layout === "list") return <TextAlignStartIcon />;
  return (view.columns?.length ?? config.columns.length) <= FEW_COLUMNS ? <Grid2x2Icon /> : <TableIcon />;
}

/** Rows per page of each layout: a list holds many more rows than a table on a screen. */
const PAGE_SIZES: Record<DataTableLayout, number> = { table: TABLE_PAGE_SIZE, cards: 24, list: 60 };

const NO_GROUP = "-";

/** The columns of at least one view, all of them without views or with a view of all. */
function availableColumns<T>(config: DataTableConfig<T>) {
  const views = config.views ?? [];
  if (views.length === 0 || views.some((each) => !each.columns)) return config.columns;
  const ids = new Set(views.flatMap((each) => each.columns ?? []));
  return config.columns.filter((column) => ids.has(column.id));
}

/** The state of a table: the picks of the user from the URL, and the page the server answers. */
export function useDataTable<T>(config: DataTableConfig<T>) {
  const url = useTableParams(config.id);
  const [query, setQuery] = useState(() => url.get("q") ?? "");
  const [searched, setSearched] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const phone = usePhone();

  // Read back from the URL: whatever is absent is the system's.
  const rawSort = url.get("sort");
  const sortId = rawSort?.replace(/^-/, "");
  const sortPick = rawSort && config.columns.some((column) => column.id === sortId && column.sortable) ? { id: sortId!, desc: rawSort.startsWith("-") } : null;
  const filterPicks = Object.fromEntries(
    (config.facets ?? []).flatMap((facet) => {
      const values = url.list(`f.${facet.id}`);
      return values ? [[facet.id, values]] : [];
    }),
  );
  // `-` is the pick of no grouping, against a `defaultGroupBy`.
  const groupParam = url.get("group");
  const groupPick = groupParam === NO_GROUP ? "" : config.groupings?.some((each) => each.id === groupParam) ? groupParam! : undefined;
  const hideParam = url.get("hide");
  const hiddenPick = useMemo(() => (hideParam === null ? null : new Set(hideParam.split(",").filter(Boolean))), [hideParam]);
  const showParam = url.get("show");
  const shownPick = useMemo(() => (showParam === null ? null : new Set(showParam.split(",").filter(Boolean))), [showParam]);
  const viewId = config.views?.some((each) => each.id === url.get("view")) ? url.get("view")! : (config.views?.[0]?.id ?? "");
  const page = Math.max(Number(url.get("page")) || 1, 1);
  const folded = url.list("fold") ?? [];
  // A view setting of the moment, out of the URL; never on a phone, too narrow.
  const [pinnedPick, setPinned] = useState(true);
  const pinned = pinnedPick && !phone;

  const filters = { ...config.defaultFilters, ...filterPicks };
  const sort = sortPick ?? config.defaultSort ?? TABLE_DEFAULT_SORT;
  const hidden = hiddenPick ?? new Set<string>();
  const shown = shownPick ?? new Set<string>();
  const picks: DataTablePicks = { filters: filterPicks, sort: sortPick, groupBy: groupPick, hidden: hiddenPick, shown: shownPick };

  const view = config.views?.find((each) => each.id === viewId);
  // Those of any view may be shown: the view's, less the hidden ones, plus the shown ones.
  const available = useMemo(() => availableColumns(config), [config]);
  const columns = useMemo(
    () =>
      available.filter((column) =>
        !view?.columns || view.columns.includes(column.id) ? !hiddenPick?.has(column.id) : !!shownPick?.has(column.id),
      ),
    [available, hiddenPick, shownPick, view],
  );
  const layout = view?.layout ?? "table";
  const grouping = config.groupings?.find((each) => each.id === (groupPick ?? config.defaultGroupBy));

  // The search waits for a pause in the typing before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearched((previous) => {
        if (previous.trim() !== query.trim()) writeTableParams(config.id, { q: query.trim() || null, page: null });
        return query;
      });
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [config.id, query]);

  const request: TableQuery = {
    q: searched.trim(),
    filters,
    sort,
    groupBy: grouping?.id ?? null,
    folded,
    page,
    pageSize: view?.pageSize ?? config.pageSize ?? PAGE_SIZES[layout],
  };
  // One call per distinct request, view parameters and source, the answer of an outdated one dropped.
  const body = JSON.stringify([request, view?.params ?? {}]);
  const key = `${body}#${attempt}`;
  const [answer, setAnswer] = useState<{ key: string; fetch: DataTableConfig<T>["fetch"]; page?: TablePage<T>; error?: true } | null>(null);
  // While a call runs, the last page still feeds the counts and the pagination.
  const [last, setLast] = useState<TablePage<T> | null>(null);
  const { fetch } = config;
  useEffect(() => {
    let live = true;
    const answered = `${body}#${attempt}`;
    const [query, params] = JSON.parse(body) as [TableQuery, Record<string, string>];
    fetch(query, params).then(
      (result) => {
        if (!live) return;
        setAnswer({ key: answered, fetch, page: result });
        setLast(result);
      },
      () => live && setAnswer({ key: answered, fetch, error: true }),
    );
    return () => {
      live = false;
    };
  }, [fetch, body, attempt]);

  // The key of the page on screen, for the answers coming after a move.
  const current = useRef(key);
  useEffect(() => {
    current.current = key;
  }, [key]);

  // A row moved shows at once, until the page fetched again after the save carries it.
  const [moved, setMoved] = useState<{ key: string; entries: TableEntry<T>[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const loading = answer?.key !== key || answer.fetch !== fetch;
  const error = !loading && !!answer?.error;
  const fetched = loading || error ? null : (answer?.page ?? null);
  const result = fetched && moved?.key === key ? { ...fetched, entries: moved.entries } : fetched;
  const filtered = searched.trim() !== "" || Object.values(filters).some((values) => values.length > 0);

  // Rows move by the handle of an order column, in any layout, sorted by it, neither searched nor filtered.
  const order = columns.find((column) => column.order);
  const movable = !!config.reorder && !!order;
  const blocked = !order
    ? null
    : saving
      ? "Enregistrement de l'ordre…"
      : sort.id !== order.id
        ? `Trier par « ${order.header} » pour déplacer`
        : filtered
          ? "Effacer la recherche et les filtres pour déplacer"
          : null;
  const { reorder } = config;
  const move = (id: string, over: string) => {
    if (!result || !reorder || blocked) return;
    const { entries } = result;
    const idOf = (entry: TableEntry<T> | undefined) => (entry && "row" in entry ? config.rowId(entry.row) : null);
    const from = entries.findIndex((entry) => idOf(entry) === id);
    const to = entries.findIndex((entry) => idOf(entry) === over);
    // Within its group only: a move to another would change its group.
    const groupOf = (index: number) => entries.slice(0, index).filter((entry) => "group" in entry).length;
    if (from < 0 || to < 0 || from === to || groupOf(from) !== groupOf(to)) return;
    const next = arrayMove(entries, from, to);
    const [above, below] = [idOf(next[to - 1]), idOf(next[to + 1])];
    const asked = key;
    setMoved({ key: asked, entries: next });
    setSaving(true);
    reorder(sort.desc ? { id, after: below, before: above } : { id, after: above, before: below })
      .then(
        (outcome) => !outcome.ok && toast.error(outcome.message),
        () => toast.error("L'ordre n'a pas pu être enregistré."),
      )
      // Fetched again without skeleton: the places of the rows come from the server.
      .then(() => fetch(...(JSON.parse(body) as [TableQuery, Record<string, string>])))
      .then((page) => {
        if (current.current !== asked) return;
        setAnswer({ key: asked, fetch, page });
        setLast(page);
      })
      .catch(() => undefined)
      .finally(() => {
        setMoved(null);
        setSaving(false);
      });
  };

  const set = url.set;
  const clearSearch = () => {
    setQuery("");
    setSearched("");
  };
  const toggle = useCallback((ids: string[], on: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  return {
    query,
    setQuery,
    picks,
    filters,
    sort,
    hidden,
    shown,
    available,
    view,
    viewId,
    layout,
    columns,
    grouping,
    folded,
    pinned,
    setPinned,
    loading,
    error,
    result,
    last,
    selected,
    toggle,
    clearSelection: () => setSelected(new Set()),
    retry: () => setAttempt((count) => count + 1),
    filtered,
    movable,
    blocked,
    move,
    changed: query.trim() !== "" || Object.keys(filterPicks).length > 0 || sortPick !== null || groupPick !== undefined || hiddenPick !== null || shownPick !== null,
    setPage: (value: number) => set({ page: value > 1 ? String(value) : null }),
    setSort: (value: TableSort | null) => set({ sort: value ? `${value.desc ? "-" : ""}${value.id}` : null, page: null }),
    setFilters: (value: Record<string, string[]>) =>
      set({ page: null, ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, value[facet.id] ?? null])) }),
    /** `""` for no grouping, `undefined` back to the default. */
    setGroupBy: (value: string | undefined) => set({ group: value === "" ? NO_GROUP : (value ?? null), fold: null, page: null }),
    toggleFold: (group: string) => {
      const next = folded.includes(group) ? folded.filter((each) => each !== group) : [...folded, group];
      set({ fold: next.length > 0 ? next : null, page: null });
    },
    setHidden: (value: Set<string> | null) => set({ hide: value ? [...value] : null }),
    setShown: (value: Set<string> | null) => set({ show: value ? [...value] : null }),
    // Back to the first page: the pages of another view may hold another number of rows.
    setView: (value: string) => set({ view: value === config.views?.[0]?.id ? null : value, page: null }),
    /** Search and filters back to the system's. */
    clearFilters: () => {
      clearSearch();
      set({ q: null, page: null, ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, null])) });
    },
    /** Back to the table as it opened: filters, sort, groups and columns. */
    resetAll: () => {
      clearSearch();
      set({
        q: null,
        page: null,
        sort: null,
        group: null,
        fold: null,
        hide: null,
        show: null,
        ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, null])),
      });
    },
  };
}

export type DataTableState<T> = ReturnType<typeof useDataTable<T>>;
