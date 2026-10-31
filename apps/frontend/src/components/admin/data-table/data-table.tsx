"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MousePointerClickIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TableCheckbox } from "./cells/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ColumnHeader } from "./column-header";
import { DataTableItems, GroupTitle } from "./items";
import { DataTableRow, EmptyState, Pagination, SelectionBar } from "./parts";
import { verticalOnly } from "./reorder";
import { Tip } from "./tip";
import { DataTableToolbar } from "./toolbar";
import type { DataTableConfig } from "./types";
import { useDataTable } from "./use-data-table";

/** Rest of the arrows, pressed in a row or held down, after which the row reached opens. */
const ARROW_REST = 150;

/** A line beside the pinned column once rows slide under it, set on the box without a render. */
const SHADOW =
  "group-data-scrolled/table:after:pointer-events-none group-data-scrolled/table:after:absolute group-data-scrolled/table:after:inset-y-0 group-data-scrolled/table:after:right-0 group-data-scrolled/table:after:w-px group-data-scrolled/table:after:bg-border";

/**
 * The table of the back office: a header of search, filters and tools, the
 * rows the server serves page by page, and the pagination. Everything the
 * user picks lives in the URL. `config` must be stable: a module constant,
 * or memoized. `onRowClick` (stable too) opens a row, e.g. in a detail panel;
 * `activeRowId` highlights the one opened, which the arrows then move.
 */
export function DataTable<T>({
  config: base,
  onRowClick,
  activeRowId = null,
}: {
  config: DataTableConfig<T>;
  onRowClick?: (row: T) => void;
  activeRowId?: string | null;
}) {
  const state = useDataTable(base);
  // The config as the view shows it: without checkboxes or row menu if it says so.
  const { view } = state;
  const config = useMemo(
    () => ({ ...base, bulkActions: view?.noSelection ? undefined : base.bulkActions, actions: view?.noActions ? undefined : base.actions }),
    [base, view],
  );
  const onOpen = onRowClick ?? config.onOpen;
  const { columns, loading, result, last, pinned, selected, toggle, movable, blocked } = state;
  // Stable across server and browser renders, unlike the ids dnd-kit counts.
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => over && state.move(String(active.id), String(over.id));
  const entries = result?.entries ?? [];
  const shownIds = entries.flatMap((entry) => ("row" in entry ? [config.rowId(entry.row)] : []));
  const allShown = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
  const someShown = shownIds.some((id) => selected.has(id));
  const selectable = !!config.bulkActions;
  const span = columns.length + (selectable ? 1 : 0) + (config.actions ? 1 : 0);
  // As many as the last page: the box, as tall as its rows, keeps its height.
  const skeletons = last?.entries.length || 10;

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

  /*
   * Pressed in a row, quickly or held down, the arrows only move the
   * highlight, cheap on memoized rows: the row opens once they rest, so that
   * neither the content of the panel nor the URL, which renders the table
   * again, follow each step. A lone press opens at once.
   */
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
      const next = rows[at + (event.key === "ArrowDown" ? 1 : -1)];
      if (!next) return;
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
  }, [active, openRow, loading, entries, config]);
  // The active row kept in sight as the arrows move it.
  useEffect(() => {
    if (active === null) return;
    box.current?.querySelector(`[data-row-id="${CSS.escape(active)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, result]);

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
    const nodes = entries.map((entry) => {
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
            active={id === active}
            onOpen={openRow}
            pinBox={pin(false)}
            pinFirst={pin(true)}
            onToggle={toggle}
            movable={movable}
            blocked={blocked}
          />
        );
      }
      const { key, count } = entry.group;
      return (
        <TableRow key={`group-${key}`} className="bg-muted/40 hover:bg-muted/60">
          <TableCell colSpan={span} className="py-1.5">
            <GroupTitle title={state.grouping?.title(key)} count={count} folded={state.folded.includes(key)} onToggle={() => state.toggleFold(key)} className="sticky left-3" />
          </TableCell>
        </TableRow>
      );
    });
    if (!movable) return nodes;
    // The rows of each group in their own list: a row moves within its group only.
    const parts: ReactNode[] = [];
    let group = "";
    let ids: string[] = [];
    let rows: ReactNode[] = [];
    const flush = () => {
      if (rows.length > 0) {
        parts.push(
          <SortableContext key={`rows-${group}`} items={ids} strategy={verticalListSortingStrategy}>
            {rows}
          </SortableContext>,
        );
      }
      [ids, rows] = [[], []];
    };
    entries.forEach((entry, index) => {
      if ("row" in entry) {
        ids.push(config.rowId(entry.row));
        rows.push(nodes[index]);
      } else {
        flush();
        group = entry.group.key;
        parts.push(nodes[index]);
      }
    });
    flush();
    return parts;
  }

  // The pagination of the last page while the next one loads.
  const pager = result ?? (loading ? last : null);
  const blank = !loading && entries.length === 0;

  return (
    <div ref={box} className="flex flex-col gap-3">
      <DataTableToolbar config={config} state={state} />

      {state.layout !== "table" ? (
        // Up to the same most as a table, then scrolls: the pagination stays in sight.
        <div
          className="-m-1 overflow-y-auto p-1 [scrollbar-color:color-mix(in_oklab,var(--color-muted-foreground)_35%,transparent)_transparent] [scrollbar-width:thin]"
          style={{ maxHeight: config.maxHeight ?? "70vh" }}
        >
          <MaybeDnd on={movable} id={dndId} sensors={sensors} onDragEnd={onDragEnd}>
            <DataTableItems config={config} state={state} layout={state.layout} empty={empty} onOpen={openRow} activeRowId={active} />
          </MaybeDnd>
        </div>
      ) : (
        <div
          // As tall as its rows, up to its most; room for the message when there are none.
          className={cn("group/table relative flex flex-col border-y border-foreground/20", blank && "h-64")}
          style={{ maxHeight: config.maxHeight ?? "70vh" }}
          // Straight on the box: a render of the whole table on each scroll would make it stutter.
          onScrollCapture={(event) => event.currentTarget.toggleAttribute("data-scrolled", (event.target as HTMLElement).scrollLeft > 0)}
        >
          {/* Rows dragged by the handle of an order column, else a plain table. */}
          <MaybeDnd on={movable} vertical id={dndId} sensors={sensors} onDragEnd={onDragEnd}>
          <Table
            containerClassName="min-h-0 flex-1 [scrollbar-color:color-mix(in_oklab,var(--color-muted-foreground)_35%,transparent)_transparent] [scrollbar-width:thin]"
            className="min-w-max"
            aria-busy={loading}
          >
            {/* The line under the names, drawn by each cell: borders of a sticky header scroll away. */}
            <TableHeader className="sticky top-0 z-20 [&_th]:before:pointer-events-none [&_th]:before:absolute [&_th]:before:inset-x-0 [&_th]:before:bottom-0 [&_th]:before:h-px [&_th]:before:bg-foreground/20 [&_th:not(.sticky)]:relative [&_tr]:border-b-0">
              <TableRow ref={head}>
                {selectable && (
                  <TableHead className={cn(pin(false), pinned && "z-30", "w-10")}>
                    <TableCheckbox disabled={loading} checked={allShown} indeterminate={someShown && !allShown} onCheckedChange={(on) => toggle(shownIds, on)} aria-label="Sélectionner la page" />
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
          </MaybeDnd>
          {/* Under the names, outside the scrolling box: centred whatever the sideways scroll. */}
          {blank && <div className="absolute inset-x-0 top-9 bottom-0 flex items-center justify-center p-4">{empty}</div>}
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

/** The context of drag and drop around the rows, only when they move: up and down only in a table. */
function MaybeDnd({ on, vertical, children, ...props }: { on: boolean; vertical?: boolean; children: ReactNode } & Pick<ComponentProps<typeof DndContext>, "id" | "sensors" | "onDragEnd">) {
  if (!on) return children;
  return (
    <DndContext {...props} collisionDetection={closestCenter} modifiers={vertical ? [verticalOnly] : undefined}>
      {children}
    </DndContext>
  );
}
