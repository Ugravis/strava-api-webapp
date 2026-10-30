"use client";

import { ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, ChevronsLeftIcon, ChevronsRightIcon, InboxIcon, MousePointerClickIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CopyButton } from "./poc-bits";
import { ColumnHeader, PocToolbar, SelectionBar, Tip } from "./poc-toolbar";

export interface PocColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Sortable by this value when given. */
  sortValue?: (row: T) => string | number;
  /** Before the name of the column. */
  icon?: ReactNode;
  /** Shape of its cells while loading, a bar by default. */
  skeleton?: ReactNode;
  /** Out of the columns menu, always shown. */
  locked?: boolean;
  /** The text a floating button copies on hover, none when null. */
  copy?: (row: T) => string | null;
  className?: string;
}

export interface PocFacet<T> {
  id: string;
  label: string;
  options: { value: string; label: string; icon?: ReactNode }[];
  values: (row: T) => string[];
}

export interface PocGrouping<T> {
  id: string;
  label: string;
  key: (row: T) => string;
  title: (key: string) => ReactNode;
}

/** A way to show the rows: a table, with all or some columns, or cards. */
export interface PocTableView {
  id: string;
  label: string;
  icon: ReactNode;
  /** Shown columns, all by default. */
  columns?: string[];
  cards?: boolean;
}

/** What the table asks the server for. */
export interface PocRequest {
  query: string;
  filters: Record<string, string[]>;
  sort: Sort;
  groupBy: string | null;
  folded: string[];
  page: number;
  pageSize: number;
}

/** One page of rows, as the server answers. */
export interface PocPage<T> {
  entries: Entry<T>[];
  /** Rows matching the search and filters. */
  total: number;
  /** Of them, the rows outside folded groups. */
  visible: number;
  /** The page served, within bounds. */
  page: number;
  pages: number;
  /** Rows on the pages before. */
  before: number;
  /** Rows per option of each facet. */
  counts: Record<string, Record<string, number>>;
}

export interface PocTableConfig<T> {
  /** Names its parameters in the URL, unique on the page. */
  id: string;
  fetch: (request: PocRequest) => Promise<PocPage<T>>;
  rowId: (row: T) => string;
  /** The first one stays on screen while the table scrolls sideways. */
  columns: PocColumn<T>[];
  search: { label: string; text: (row: T) => string };
  facets?: PocFacet<T>[];
  groupings?: PocGrouping<T>[];
  views?: PocTableView[];
  /** The main action of the list, e.g. to add an item. */
  create?: { label: string; onClick: () => void };
  card?: (row: T) => ReactNode;
  /** By date of creation, newest first, unless said otherwise. */
  defaultSort?: Sort;
  /** Applied by the system, shown active only once the user picks. */
  defaultFilters?: Record<string, string[]>;
  /** Rows per page, 30 by default. */
  pageSize?: number;
  selectable?: boolean;
  /** Greyed rows, e.g. hidden entries. */
  muted?: (row: T) => boolean;
  /** Icon buttons or a menu, at the end of the row. */
  actions?: (row: T) => ReactNode;
  onOpen?: (row: T) => void;
  empty: { title: string; description: string };
  noun: (count: number) => string;
}

/** A line of a page: a row, or the title of its group. */
export type Entry<T> = { row: T } | { title: { key: string; count: number } };

export interface Sort {
  id: string;
  desc: boolean;
}

export const DEFAULT_SORT: Sort = { id: "createdAt", desc: true };
const PAGE_SIZE = 30;
const SEARCH_DELAY = 250;

/*
 * The choices of the user, apart from the defaults of the system: null (or
 * no key) until the user picks, even the default, which the header then
 * shows as active. A reset hands back to the system.
 */
export interface Picks {
  filters: Record<string, string[]>;
  sort: Sort | null;
  groupBy: string | undefined;
  hidden: Set<string> | null;
}

/** A line beside the pinned column once rows slide under it, set on the box without a render. */
const SHADOW =
  "group-data-scrolled/table:after:pointer-events-none group-data-scrolled/table:after:absolute group-data-scrolled/table:after:inset-y-0 group-data-scrolled/table:after:right-0 group-data-scrolled/table:after:w-px group-data-scrolled/table:after:bg-border";

const MOBILE = "(max-width: 639px)";
function useMobile() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(MOBILE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );
}

/**
 * The choices of the user, in the URL under the id of the table, so that
 * several tables share a page: `?users.sort=-createdAt&users.f.status=active`.
 * Written through the history, which Next follows without a server round trip.
 */
function useTableParams(id: string) {
  const params = useSearchParams();
  const get = (key: string) => params.get(`${id}.${key}`);
  const list = (key: string) => {
    const raw = get(key);
    return raw === null ? null : raw.split(",").filter(Boolean);
  };
  return { get, list, set: (changes: Record<string, string | string[] | null>) => writeParams(id, changes) };
}

function writeParams(id: string, changes: Record<string, string | string[] | null>) {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(`${id}.${key}`);
    else next.set(`${id}.${key}`, Array.isArray(value) ? value.join(",") : value);
  }
  const search = next.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

export function PocTable<T>({ config }: { config: PocTableConfig<T> }) {
  const url = useTableParams(config.id);
  const [query, setQuery] = useState(() => url.get("q") ?? "");
  const [searched, setSearched] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const mobile = useMobile();

  // Read back from the URL: whatever is absent is the system's.
  const rawSort = url.get("sort");
  const sortId = rawSort?.replace(/^-/, "");
  const sortPick = rawSort && config.columns.some((column) => column.id === sortId && column.sortValue) ? { id: sortId!, desc: rawSort.startsWith("-") } : null;
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
  // Too narrow to keep a column on screen.
  // A view setting of the moment, out of the URL.
  const [pinnedPick, setPinned] = useState(true);
  const pinned = pinnedPick && !mobile;

  const filters = { ...config.defaultFilters, ...filterPicks };
  const sort = sortPick ?? config.defaultSort ?? DEFAULT_SORT;
  const hidden = hiddenPick ?? new Set<string>();
  const picks: Picks = { filters: filterPicks, sort: sortPick, groupBy: groupPick, hidden: hiddenPick };

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
        if (previous.trim() !== query.trim()) writeParams(config.id, { q: query.trim() || null, page: null });
        return query;
      });
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [config.id, query]);

  const request: PocRequest = {
    query: searched,
    filters,
    sort,
    groupBy: grouping?.id ?? null,
    folded,
    page,
    pageSize: config.pageSize ?? PAGE_SIZE,
  };
  // One call per distinct request, the answer of an outdated one dropped.
  const body = JSON.stringify(request);
  const key = `${body}#${attempt}`;
  const [answer, setAnswer] = useState<{ key: string; page?: PocPage<T>; error?: true } | null>(null);
  // While a call runs, the last page still feeds the counts and the pagination.
  const [last, setLast] = useState<PocPage<T> | null>(null);
  useEffect(() => {
    let live = true;
    const answered = `${body}#${attempt}`;
    config.fetch(JSON.parse(body) as PocRequest).then(
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
  }, [config, body, attempt]);

  const loading = answer?.key !== key;
  const error = !loading && !!answer?.error;
  const result = loading || error ? null : (answer?.page ?? null);
  const entries = result?.entries ?? [];
  const filtered = searched.trim() !== "" || Object.values(filters).some((values) => values.length > 0);

  const shown = entries.flatMap((entry) => ("row" in entry ? [entry.row] : []));
  const shownIds = shown.map(config.rowId);
  const allShown = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const someShown = shownIds.some((id) => selected.has(id));
  const span = columns.length + (config.selectable ? 1 : 0) + (config.actions ? 1 : 0);
  const skeletons = Math.min(last?.entries.length || 10, 12);

  /** Classes of the cells pinned on the left: the box, then the first column. */
  const pin = (first: boolean) => (pinned ? cn("sticky left-0 z-10", first && config.selectable && "left-10", first && SHADOW) : "");

  const setPage = (value: number) => url.set({ page: value > 1 ? String(value) : null });
  const onSort = (value: Sort | null) => url.set({ sort: value ? `${value.desc ? "-" : ""}${value.id}` : null, page: null });

  function reset() {
    setQuery("");
    setSearched("");
    url.set({ q: null, page: null, ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, null])) });
  }

  /** Back to the table as it opened: filters, sort, groups and columns. */
  function resetAll() {
    reset();
    url.set({ sort: null, group: null, fold: null, hide: null });
  }

  const changed = query.trim() !== "" || Object.keys(filterPicks).length > 0 || sortPick !== null || groupPick !== undefined || hiddenPick !== null;

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

  function renderRow(row: T) {
    const id = config.rowId(row);
    return <PocRow key={id} config={config} row={row} id={id} columns={columns} selected={selected.has(id)} pinBox={pin(false)} pinFirst={pin(true)} onToggle={toggle} />;
  }

  function emptyState() {
    const Icon = error ? TriangleAlertIcon : filtered ? SearchXIcon : InboxIcon;
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
        <span className={cn("flex size-10 items-center justify-center rounded-full bg-muted", error && "bg-destructive/10 text-destructive")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="font-medium">{error ? "Chargement impossible" : filtered ? "Aucun résultat" : config.empty.title}</p>
        <p className="text-sm text-muted-foreground">
          {error ? "L'API n'a pas répondu. Réessaie dans un instant." : filtered ? "Aucune ligne ne correspond à ces filtres." : config.empty.description}
        </p>
        {(error || filtered) && (
          <Button variant="outline" size="sm" className="mt-1" onClick={error ? () => setAttempt((count) => count + 1) : reset}>
            {error ? "Réessayer" : "Effacer les filtres"}
          </Button>
        )}
      </div>
    );
  }

  function renderBody() {
    if (loading) {
      return Array.from({ length: skeletons }, (_, index) => (
        <TableRow key={index} className="hover:bg-background">
          {config.selectable && (
            <TableCell className={cn(pin(false), "w-10")}>
              <Skeleton className="size-4 rounded-sm" />
            </TableCell>
          )}
          {columns.map((column, at) => (
            <TableCell key={column.id} className={cn(at === 0 && pin(true))}>
              {column.skeleton ?? <Skeleton className={cn("inline-block h-4", index % 2 ? "w-16" : "w-24")} />}
            </TableCell>
          ))}
          {config.actions && <TableCell />}
        </TableRow>
      ));
    }
    return entries.map((entry) => {
      if ("row" in entry) return renderRow(entry.row);
      const { key: group, count } = entry.title;
      return (
        <TableRow key={`group-${group}`} className="bg-muted/40 hover:bg-muted/60">
          <TableCell colSpan={span} className="py-1.5">
            <button
              type="button"
              onClick={() => {
                const next = folded.includes(group) ? folded.filter((each) => each !== group) : [...folded, group];
                url.set({ fold: next.length > 0 ? next : null, page: null });
              }}
              aria-expanded={!folded.includes(group)}
              className="sticky left-3 flex items-center gap-1.5 text-xs font-medium"
            >
              {folded.includes(group) ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
              {grouping?.title(group)}
              <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
            </button>
          </TableCell>
        </TableRow>
      );
    });
  }

  // The pagination of the last page while the next one loads.
  const pager = result ?? (loading ? last : null);

  return (
    <div className="flex flex-col gap-3">
      <PocToolbar
        config={config}
        counts={last?.counts ?? {}}
        query={query}
        onQuery={setQuery}
        filters={filters}
        onFilters={(value) => url.set({ page: null, ...Object.fromEntries((config.facets ?? []).map((facet) => [`f.${facet.id}`, value[facet.id] ?? null])) })}
        onReset={resetAll}
        filtered={changed}
        picks={picks}
        sort={sort}
        onSort={onSort}
        groupBy={groupPick ?? null}
        onGroupBy={(value) => url.set({ group: value ?? null, fold: null, page: null })}
        hidden={hidden}
        onHidden={(value) => url.set({ hide: value ? [...value] : null })}
        view={viewId}
        onView={(value) => url.set({ view: value === config.views?.[0]?.id ? null : value })}
        cards={!!view?.cards}
        pinned={pinned}
        onPinned={setPinned}
      />

      {view?.cards && config.card ? (
        loading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : shown.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((row) => (
              <li key={config.rowId(row)}>{config.card!(row)}</li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed py-12">{emptyState()}</div>
        )
      ) : (
        <div
          className="group/table relative h-[70vh] border-y border-foreground/20"
          // Straight on the box: a render of the whole table on each scroll would make it stutter.
          onScrollCapture={(event) => event.currentTarget.toggleAttribute("data-scrolled", (event.target as HTMLElement).scrollLeft > 0)}
        >
          <Table
            containerClassName="h-full [scrollbar-color:color-mix(in_oklab,var(--color-muted-foreground)_35%,transparent)_transparent] [scrollbar-width:thin]"
            className="min-w-max"
            aria-busy={loading}
          >
            {/* The line under the names, drawn by each cell: borders of a sticky header scroll away. */}
            <TableHeader className="sticky top-0 z-20 [&_th]:before:pointer-events-none [&_th]:before:absolute [&_th]:before:inset-x-0 [&_th]:before:bottom-0 [&_th]:before:h-px [&_th]:before:bg-foreground/20 [&_th:not(.sticky)]:relative [&_tr]:border-b-0">
              <TableRow>
                {config.selectable && (
                  <TableHead className={cn(pin(false), pinned && "z-30", "w-10")}>
                    <Checkbox
                      checked={allShown}
                      indeterminate={someShown && !allShown}
                      onCheckedChange={(on) => toggle(shownIds, on)}
                      aria-label="Sélectionner la page"
                    />
                  </TableHead>
                )}
                {columns.map((column, index) => (
                  <TableHead key={column.id} className={cn(index === 0 && pin(true), index === 0 && pinned && "z-30", column.className)}>
                    <ColumnHeader
                      column={column}
                      sort={sort}
                      onSort={onSort}
                      onHide={column.locked ? undefined : () => url.set({ hide: [...hidden, column.id] })}
                    />
                  </TableHead>
                ))}
                {config.actions && (
                  <TableHead className="w-px text-center">
                    <Tip label="Actions">
                      <span className="inline-flex text-muted-foreground/70 [&_svg]:size-3.5">
                        <MousePointerClickIcon aria-label="Actions" />
                      </span>
                    </Tip>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b-0">{renderBody()}</TableBody>
          </Table>
          {/* Under the names, outside the scrolling box: centred whatever the sideways scroll. */}
          {!loading && entries.length === 0 && <div className="absolute inset-x-0 top-9 bottom-0 flex items-center justify-center p-4">{emptyState()}</div>}
        </div>
      )}

      {pager && pager.visible > 0 && (
        <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground", loading && "pointer-events-none opacity-60")}>
          <p>
            {pager.before + 1}–{pager.before + pager.entries.filter((entry) => "row" in entry).length} sur {pager.visible} {config.noun(pager.visible)}
            {pager.visible < pager.total && ` (${pager.total - pager.visible} repliés)`}
          </p>
          <div className="flex items-center gap-1">
            <Button size="icon-xs" variant="ghost" disabled={pager.page === 1} onClick={() => setPage(1)} aria-label="Première page">
              <ChevronsLeftIcon />
            </Button>
            <Button size="icon-xs" variant="ghost" disabled={pager.page === 1} onClick={() => setPage(pager.page - 1)} aria-label="Page précédente">
              <ChevronLeftIcon />
            </Button>
            <span className="flex items-center gap-1.5 px-1">
              Page
              <PageInput key={pager.page} page={pager.page} pages={pager.pages} onPage={setPage} />
              sur {pager.pages}
            </span>
            <Button size="icon-xs" variant="ghost" disabled={pager.page === pager.pages} onClick={() => setPage(pager.page + 1)} aria-label="Page suivante">
              <ChevronRightIcon />
            </Button>
            <Button size="icon-xs" variant="ghost" disabled={pager.page === pager.pages} onClick={() => setPage(pager.pages)} aria-label="Dernière page">
              <ChevronsRightIcon />
            </Button>
          </div>
        </nav>
      )}

      <SelectionBar count={selected.size} onClear={() => setSelected(new Set())} />
    </div>
  );
}

interface PocRowProps<T> {
  config: PocTableConfig<T>;
  row: T;
  id: string;
  columns: PocColumn<T>[];
  selected: boolean;
  pinBox: string;
  pinFirst: string;
  onToggle: (ids: string[], on: boolean) => void;
}

/** A row, drawn again only when its own props change, not on every change of the table. */
const PocRow = memo(function PocRow<T>({ config, row, id, columns, selected, pinBox, pinFirst, onToggle }: PocRowProps<T>) {
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      onClick={(event) => {
        // Buttons, links and checkboxes of the row keep their own click.
        if ((event.target as HTMLElement).closest("button, a, [role=checkbox], [role=menuitem]")) return;
        config.onOpen?.(row);
      }}
      className={cn("group/row", config.onOpen && "cursor-pointer", config.muted?.(row) && "text-muted-foreground")}
    >
      {config.selectable && (
        <TableCell className={cn(pinBox, "w-10")}>
          <Checkbox checked={selected} onCheckedChange={(on) => onToggle([id], on)} aria-label="Sélectionner la ligne" />
        </TableCell>
      )}
      {columns.map((column, index) => (
        <TableCell key={column.id} className={cn("group/cell relative", index === 0 && pinFirst, column.className)}>
          {column.cell(row)}
          {column.copy && <CopyButton value={column.copy(row)} />}
        </TableCell>
      ))}
      {config.actions && <TableCell className="w-px text-center">{config.actions(row)}</TableCell>}
    </TableRow>
  );
}) as <T>(props: PocRowProps<T>) => ReactNode;

/** The page typed in, applied on Enter or on leaving, kept within bounds. */
function PageInput({ page, pages, onPage }: { page: number; pages: number; onPage: (value: number) => void }) {
  const [text, setText] = useState(String(page));
  function apply() {
    const value = Math.min(Math.max(Math.round(Number(text)) || page, 1), pages);
    setText(String(value));
    onPage(value);
  }
  return (
    <input
      inputMode="numeric"
      value={text}
      onChange={(event) => setText(event.target.value.replace(/\D/g, ""))}
      onBlur={apply}
      onKeyDown={(event) => event.key === "Enter" && apply()}
      onFocus={(event) => event.target.select()}
      aria-label="Page"
      className="h-6 w-9 rounded-md border bg-background text-center text-xs text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
