"use client";

import { TABLE_DEFAULT_SORT, TABLE_PAGE_SIZE, type TablePage, type TableQuery, type TableSort } from "@kilotrace/shared/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataTableConfig, DataTablePicks } from "./types";
import { usePhone, useTableParams, writeTableParams } from "./use-table-params";

const SEARCH_DELAY = 250;

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
  const groupPick = config.groupings?.some((each) => each.id === url.get("group")) ? url.get("group")! : undefined;
  const hideParam = url.get("hide");
  const hiddenPick = useMemo(() => (hideParam === null ? null : new Set(hideParam.split(",").filter(Boolean))), [hideParam]);
  const viewId = config.views?.some((each) => each.id === url.get("view")) ? url.get("view")! : (config.views?.[0]?.id ?? "");
  const page = Math.max(Number(url.get("page")) || 1, 1);
  const folded = url.list("fold") ?? [];
  // A view setting of the moment, out of the URL; never on a phone, too narrow.
  const [pinnedPick, setPinned] = useState(true);
  const pinned = pinnedPick && !phone;

  const filters = { ...config.defaultFilters, ...filterPicks };
  const sort = sortPick ?? config.defaultSort ?? TABLE_DEFAULT_SORT;
  const hidden = hiddenPick ?? new Set<string>();
  const picks: DataTablePicks = { filters: filterPicks, sort: sortPick, groupBy: groupPick, hidden: hiddenPick };

  const view = config.views?.find((each) => each.id === viewId);
  const columns = useMemo(
    () => config.columns.filter((column) => !hiddenPick?.has(column.id) && (!view?.columns || view.columns.includes(column.id))),
    [config.columns, hiddenPick, view],
  );
  const grouping = view?.cards ? undefined : config.groupings?.find((each) => each.id === groupPick);

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
    pageSize: config.pageSize ?? TABLE_PAGE_SIZE,
  };
  // One call per distinct request, the answer of an outdated one dropped.
  const body = JSON.stringify(request);
  const key = `${body}#${attempt}`;
  const [answer, setAnswer] = useState<{ key: string; page?: TablePage<T>; error?: true } | null>(null);
  // While a call runs, the last page still feeds the counts and the pagination.
  const [last, setLast] = useState<TablePage<T> | null>(null);
  const { fetch } = config;
  useEffect(() => {
    let live = true;
    const answered = `${body}#${attempt}`;
    fetch(JSON.parse(body) as TableQuery).then(
      (result) => {
        if (!live) return;
        setAnswer({ key: answered, page: result });
        setLast(result);
      },
      () => live && setAnswer({ key: answered, error: true }),
    );
    return () => {
      live = false;
    };
  }, [fetch, body, attempt]);

  const loading = answer?.key !== key;
  const error = !loading && !!answer?.error;
  const result = loading || error ? null : (answer?.page ?? null);

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
    view,
    viewId,
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
    filtered: searched.trim() !== "" || Object.values(filters).some((values) => values.length > 0),
    changed: query.trim() !== "" || Object.keys(filterPicks).length > 0 || sortPick !== null || groupPick !== undefined || hiddenPick !== null,
    setPage: (value: number) => set({ page: value > 1 ? String(value) : null }),
    setSort: (value: TableSort | null) => set({ sort: value ? `${value.desc ? "-" : ""}${value.id}` : null, page: null }),
    setFilters: (value: Record<string, string[]>) =>
      set({ page: null, ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, value[facet.id] ?? null])) }),
    setGroupBy: (value: string | undefined) => set({ group: value ?? null, fold: null, page: null }),
    toggleFold: (group: string) => {
      const next = folded.includes(group) ? folded.filter((each) => each !== group) : [...folded, group];
      set({ fold: next.length > 0 ? next : null, page: null });
    },
    setHidden: (value: Set<string> | null) => set({ hide: value ? [...value] : null }),
    setView: (value: string) => set({ view: value === config.views?.[0]?.id ? null : value }),
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
        ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, null])),
      });
    },
  };
}

export type DataTableState<T> = ReturnType<typeof useDataTable<T>>;
