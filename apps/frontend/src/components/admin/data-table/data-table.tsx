"use client";

import { ChevronDownIcon, ChevronRightIcon, MousePointerClickIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ColumnHeader } from "./column-header";
import { DataTableRow, EmptyState, Pagination, SelectionBar } from "./parts";
import { Tip } from "./tip";
import { DataTableToolbar } from "./toolbar";
import type { DataTableConfig } from "./types";
import { useDataTable } from "./use-data-table";

/** A line beside the pinned column once rows slide under it, set on the box without a render. */
const SHADOW =
  "group-data-scrolled/table:after:pointer-events-none group-data-scrolled/table:after:absolute group-data-scrolled/table:after:inset-y-0 group-data-scrolled/table:after:right-0 group-data-scrolled/table:after:w-px group-data-scrolled/table:after:bg-border";

/**
 * The table of the back office: a header of search, filters and tools, the
 * rows the server serves page by page, and the pagination. Everything the
 * user picks lives in the URL. `config` must be stable: a module constant,
 * or memoized.
 */
export function DataTable<T>({ config }: { config: DataTableConfig<T> }) {
  const state = useDataTable(config);
  const { columns, loading, result, last, pinned, selected, toggle } = state;
  const entries = result?.entries ?? [];
  const shownIds = entries.flatMap((entry) => ("row" in entry ? [config.rowId(entry.row)] : []));
  const allShown = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const someShown = shownIds.some((id) => selected.has(id));
  const selectable = !!config.bulkActions;
  const span = columns.length + (selectable ? 1 : 0) + (config.actions ? 1 : 0);
  const skeletons = Math.min(last?.entries.length || 10, 12);

  // The skeleton keeps the widths of the columns as they were, set on the cells
  // before paint: rebuilt on the bars alone, the table would shrink and jump.
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

  /** Classes of the cells pinned on the left: the box, then the first column. */
  const pin = (first: boolean) => (pinned ? cn("sticky left-0 z-10", first && selectable && "left-10", first && SHADOW) : "");

  const empty = (
    <EmptyState error={state.error} filtered={state.filtered} empty={config.empty} onRetry={state.retry} onClear={state.clearFilters} />
  );

  function renderBody() {
    if (loading) {
      return Array.from({ length: skeletons }, (_, index) => (
        <TableRow key={index} className="hover:bg-background">
          {selectable && (
            <TableCell className={cn(pin(false), "w-10")}>
              <Skeleton className="size-4 rounded-sm" />
            </TableCell>
          )}
          {columns.map((column, at) => (
            <TableCell key={column.id} className={cn(at === 0 && pin(true))}>
              {/* Of no width of its own: the cell keeps the width of its column. */}
              <div className="w-0 min-w-full overflow-hidden">
                {column.skeleton ?? <Skeleton className={cn("inline-block h-4", index % 2 ? "w-16" : "w-24")} />}
              </div>
            </TableCell>
          ))}
          {config.actions && <TableCell />}
        </TableRow>
      ));
    }
    return entries.map((entry) => {
      if ("row" in entry) {
        const id = config.rowId(entry.row);
        return (
          <DataTableRow
            key={id}
            config={config}
            row={entry.row}
            id={id}
            columns={columns}
            selected={selected.has(id)}
            pinBox={pin(false)}
            pinFirst={pin(true)}
            onToggle={toggle}
          />
        );
      }
      const { key, count } = entry.group;
      const folded = state.folded.includes(key);
      return (
        <TableRow key={`group-${key}`} className="bg-muted/40 hover:bg-muted/60">
          <TableCell colSpan={span} className="py-1.5">
            <button type="button" onClick={() => state.toggleFold(key)} aria-expanded={!folded} className="sticky left-3 flex items-center gap-1.5 text-xs font-medium">
              {folded ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
              {state.grouping?.title(key)}
              <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
            </button>
          </TableCell>
        </TableRow>
      );
    });
  }

  // The pagination of the last page while the next one loads.
  const pager = result ?? (loading ? last : null);
  const rows = entries.flatMap((entry) => ("row" in entry ? [entry.row] : []));

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar config={config} state={state} />

      {state.view?.cards && config.card ? (
        loading ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li key={config.rowId(row)}>{config.card!(row)}</li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed py-12">{empty}</div>
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
              <TableRow ref={head}>
                {selectable && (
                  <TableHead className={cn(pin(false), pinned && "z-30", "w-10")}>
                    <Checkbox disabled={loading} checked={allShown} indeterminate={someShown && !allShown} onCheckedChange={(on) => toggle(shownIds, on)} aria-label="Sélectionner la page" />
                  </TableHead>
                )}
                {columns.map((column, index) => (
                  <TableHead key={column.id} data-column={column.id} className={cn(index === 0 && pin(true), index === 0 && pinned && "z-30", column.className)}>
                    <ColumnHeader
                      column={column}
                      sort={state.sort}
                      disabled={loading}
                      onSort={state.setSort}
                      onHide={column.locked ? undefined : () => state.setHidden(new Set([...state.hidden, column.id]))}
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
          {!loading && entries.length === 0 && <div className="absolute inset-x-0 top-9 bottom-0 flex items-center justify-center p-4">{empty}</div>}
        </div>
      )}

      {pager && pager.visible > 0 && <Pagination pager={pager} loading={loading} noun={config.noun} onPage={state.setPage} />}

      {config.bulkActions && (
        <SelectionBar count={selected.size} onClear={state.clearSelection}>
          {config.bulkActions([...selected], state.clearSelection)}
        </SelectionBar>
      )}
    </div>
  );
}
