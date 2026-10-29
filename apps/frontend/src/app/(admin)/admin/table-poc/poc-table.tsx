"use client";

import { ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, InboxIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ColumnHeader, PocToolbar, SelectionBar } from "./poc-toolbar";

const PAGE_SIZE = 20;

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

export interface PocTableConfig<T> {
  rows: T[];
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
  defaultSort: Sort;
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
type Entry<T> = { row: T } | { title: { key: string; count: number } };

export type PocState = "data" | "loading" | "empty" | "error";
export interface Sort {
  id: string;
  desc: boolean;
}

/** A line beside the pinned column once rows slide under it. */
const SHADOW = "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-border";

export function PocTable<T>({ config, state }: { config: PocTableConfig<T>; state: PocState }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<Sort>(config.defaultSort);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pinned, setPinned] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [viewId, setViewId] = useState(config.views?.[0]?.id ?? "");

  const view = config.views?.find((each) => each.id === viewId);
  const columns = config.columns.filter((column) => !hidden.has(column.id) && (!view?.columns || view.columns.includes(column.id)));
  const grouping = view?.cards ? undefined : config.groupings?.find((each) => each.id === groupBy);
  const filtered = Object.values(filters).some((values) => values.length > 0) || query.trim() !== "";

  const rows = useMemo(() => {
    const source = state === "empty" ? [] : config.rows;
    const q = query.trim().toLowerCase();
    const column = config.columns.find((each) => each.id === sort.id);
    const kept = source.filter(
      (row) =>
        (!q || config.search.text(row).toLowerCase().includes(q)) &&
        (config.facets ?? []).every((facet) => {
          const wanted = filters[facet.id] ?? [];
          return wanted.length === 0 || facet.values(row).some((value) => wanted.includes(value));
        }),
    );
    const compare = (a: T, b: T) => {
      if (!column?.sortValue) return 0;
      const [x, y] = [column.sortValue(a), column.sortValue(b)];
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr");
      return sort.desc ? -order : order;
    };
    // Grouped, the groups come first, each sorted within.
    return kept.sort((a, b) => (grouping ? grouping.key(a).localeCompare(grouping.key(b), "fr") : 0) || compare(a, b));
  }, [config, state, query, filters, sort, grouping]);

  // Pages of the rows on screen: a folded group keeps its title only, out
  // of the count, and a group cut by a page repeats its title on the next.
  const { pageList, visible } = useMemo(() => {
    const list: Entry<T>[][] = [[]];
    let count = 0;
    const groups = grouping ? Map.groupBy(rows, grouping.key) : new Map([["", rows]]);
    for (const [key, items] of groups) {
      const title = { key, count: items.length };
      const kept = folded.has(key) ? [] : items;
      if (kept.length > 0 && count > 0 && count % PAGE_SIZE === 0) list.push([]);
      if (grouping) list.at(-1)!.push({ title });
      kept.forEach((row, index) => {
        if (index > 0 && count % PAGE_SIZE === 0) list.push(grouping ? [{ title }] : []);
        list.at(-1)!.push({ row });
        count += 1;
      });
    }
    return { pageList: list, visible: count };
  }, [rows, grouping, folded]);

  const pages = pageList.length;
  const current = Math.min(page, pages);
  const entries = pageList[current - 1]!;
  const shown = entries.flatMap((entry) => ("row" in entry ? [entry.row] : []));
  const before = pageList.slice(0, current - 1).reduce((sum, list) => sum + list.filter((entry) => "row" in entry).length, 0);
  const shownIds = shown.map(config.rowId);
  const allShown = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const someShown = shownIds.some((id) => selected.has(id));
  const span = columns.length + (config.selectable ? 1 : 0) + (config.actions ? 1 : 0);

  /** Classes of the cells pinned on the left: the box, then the first column. */
  const pin = (first: boolean) =>
    pinned && cn("sticky left-0 z-10", first && config.selectable && "left-10", first && scrolled && SHADOW);

  function reset() {
    setQuery("");
    setFilters({});
    setPage(1);
  }

  /** Back to the table as it opened: filters, sort, groups and columns. */
  function resetAll() {
    reset();
    setSort(config.defaultSort);
    setGroupBy(null);
    setFolded(new Set());
    setHidden(new Set());
  }

  const changed = filtered || sort.id !== config.defaultSort.id || sort.desc !== config.defaultSort.desc || groupBy !== null || hidden.size > 0;

  function toggle(ids: string[], on: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function renderRow(row: T) {
    const id = config.rowId(row);
    const isSelected = selected.has(id);
    return (
      <TableRow
        key={id}
        data-state={isSelected ? "selected" : undefined}
        onClick={(event) => {
          // Buttons, links and checkboxes of the row keep their own click.
          if ((event.target as HTMLElement).closest("button, a, [role=checkbox], [role=menuitem]")) return;
          config.onOpen?.(row);
        }}
        className={cn("group/row", config.onOpen && "cursor-pointer", config.muted?.(row) && "text-muted-foreground")}
      >
        {config.selectable && (
          <TableCell className={cn(pin(false), "w-10")}>
            <Checkbox checked={isSelected} onCheckedChange={(on) => toggle([id], on)} aria-label="Sélectionner la ligne" />
          </TableCell>
        )}
        {columns.map((column, index) => (
          <TableCell
            key={column.id}
            className={cn(index === 0 && pin(true), column.className)}
          >
            {column.cell(row)}
          </TableCell>
        ))}
        {config.actions && <TableCell className="w-px text-right">{config.actions(row)}</TableCell>}
      </TableRow>
    );
  }

  function emptyState() {
    const error = state === "error";
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
          <Button variant="outline" size="sm" className="mt-1" onClick={error ? undefined : reset}>
            {error ? "Réessayer" : "Effacer les filtres"}
          </Button>
        )}
      </div>
    );
  }

  function renderBody() {
    if (state === "loading") {
      return Array.from({ length: 10 }, (_, index) => (
        <TableRow key={index} className="hover:bg-background">
          {config.selectable && (
            <TableCell className="w-10">
              <Skeleton className="size-4 rounded-sm" />
            </TableCell>
          )}
          {columns.map((column) => (
            <TableCell key={column.id}>
              {column.skeleton ?? <Skeleton className={cn("inline-block h-4", index % 2 ? "w-16" : "w-24")} />}
            </TableCell>
          ))}
          {config.actions && <TableCell />}
        </TableRow>
      ));
    }
    if (state === "error" || entries.length === 0) return null;
    return entries.map((entry) => {
      if ("row" in entry) return renderRow(entry.row);
      const { key, count } = entry.title;
      return (
        <TableRow key={`group-${key}`} className="bg-muted/40 hover:bg-muted/60">
          <TableCell colSpan={span} className="py-1.5">
            <button
              type="button"
              onClick={() => setFolded((previous) => new Set(previous.has(key) ? [...previous].filter((each) => each !== key) : [...previous, key]))}
              aria-expanded={!folded.has(key)}
              className="sticky left-3 flex items-center gap-1.5 text-xs font-medium"
            >
              {folded.has(key) ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
              {grouping!.title(key)}
              <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
            </button>
          </TableCell>
        </TableRow>
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <PocToolbar
        config={config}
        query={query}
        onQuery={(value) => {
          setQuery(value);
          setPage(1);
        }}
        filters={filters}
        onFilters={(value) => {
          setFilters(value);
          setPage(1);
        }}
        onReset={resetAll}
        filtered={changed}
        sort={sort}
        onSort={setSort}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        hidden={hidden}
        onHidden={setHidden}
        view={viewId}
        onView={setViewId}
        cards={!!view?.cards}
        pinned={pinned}
        onPinned={setPinned}
      />

      {view?.cards && config.card ? (
        state === "data" && shown.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((row) => (
              <li key={config.rowId(row)}>{config.card!(row)}</li>
            ))}
          </ul>
        ) : state === "loading" ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed py-12">{emptyState()}</div>
        )
      ) : (
      <div onScrollCapture={(event) => setScrolled((event.target as HTMLElement).scrollLeft > 0)}>
      <Table containerClassName="max-h-[70vh] border-y" className="min-w-max">
        <TableHeader className="sticky top-0 z-20">
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
              <TableHead
                key={column.id}
                className={cn(index === 0 && pin(true), index === 0 && pinned && "z-30", column.className)}
              >
                <ColumnHeader column={column} sort={sort} onSort={setSort} onHide={column.locked ? undefined : () => setHidden(new Set([...hidden, column.id]))} />
              </TableHead>
            ))}
            {config.actions && <TableHead className="w-px" aria-label="Actions" />}
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-b-0">{renderBody()}</TableBody>
      </Table>
      {state !== "loading" && (state === "error" || entries.length === 0) && <div className="border-b py-16">{emptyState()}</div>}
      </div>
      )}

      {state === "data" && visible > 0 && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            {before + 1}–{before + shown.length} sur {visible} {config.noun(visible)}
            {visible < rows.length && ` (${rows.length - visible} repliés)`}
          </p>
          <div className="flex items-center gap-1">
            <Button size="icon-xs" variant="ghost" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Page précédente">
              <ChevronLeftIcon />
            </Button>
            {Array.from({ length: pages }, (_, index) => index + 1).map((each) => (
              <Button key={each} size="icon-xs" className="text-xs" variant={each === current ? "secondary" : "ghost"} onClick={() => setPage(each)} aria-current={each === current ? "page" : undefined}>
                {each}
              </Button>
            ))}
            <Button size="icon-xs" variant="ghost" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Page suivante">
              <ChevronRightIcon />
            </Button>
          </div>
        </nav>
      )}

      <SelectionBar count={selected.size} onClear={() => setSelected(new Set())} />
    </div>
  );
}
