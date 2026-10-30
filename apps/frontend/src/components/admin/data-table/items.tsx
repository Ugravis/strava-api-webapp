"use client";

import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { type KeyboardEvent, memo, type MouseEvent, type ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CopyButton } from "./cells/base";
import { MovableItem } from "./reorder";
import type { DataTableColumn, DataTableConfig } from "./types";
import type { DataTableState } from "./use-data-table";

/** The box of the items of each layout but the table, and of their skeletons. */
const BOXES = {
  cards: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
  list: "flex flex-wrap items-start gap-2",
};

/** The title of a group, folding it. */
export function GroupTitle({ title, count, folded, onToggle, className }: { title: ReactNode; count: number; folded: boolean; onToggle: () => void; className?: string }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={!folded} className={cn("flex items-center gap-1.5 text-xs font-medium", className)}>
      {folded ? <ChevronRightIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
      {title}
      <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}

/**
 * The rows as cards or as a list, drawn with the cells of the table: one
 * under the other in a card, side by side in an item of the list, the first
 * one set apart.
 */
export function DataTableItems<T>({ config, state, layout, empty }: { config: DataTableConfig<T>; state: DataTableState<T>; layout: "cards" | "list"; empty: ReactNode }) {
  const { loading, result, last, selected, toggle, movable, blocked } = state;
  // The order column draws before the title, not as a value.
  const order = state.columns.find((column) => column.order);
  const columns = state.columns.filter((column) => !column.order);
  const entries = result?.entries ?? [];
  if (loading) {
    const count = last?.entries.length || 9;
    return (
      <div className={BOXES[layout]} aria-busy>
        {Array.from({ length: count }, (_, index) => (
          <ItemFrame key={index} layout={layout}>
            {columns.map((column, at) => (
              <Value key={column.id} column={column} layout={layout} first={at === 0}>
                {column.skeleton ?? <Skeleton className={cn("inline-block h-4", index % 2 ? "w-16" : "w-24")} />}
              </Value>
            ))}
          </ItemFrame>
        ))}
      </div>
    );
  }
  if (entries.length === 0) return <div className="rounded-xl border border-dashed py-12">{empty}</div>;
  const nodes = entries.map((entry) => {
    if ("row" in entry) {
      const id = config.rowId(entry.row);
      return (
        <Item
          key={id}
          config={config}
          row={entry.row}
          id={id}
          columns={columns}
          order={order}
          layout={layout}
          selected={selected.has(id)}
          onToggle={toggle}
          movable={movable}
          blocked={blocked}
        />
      );
    }
    const { key, count } = entry.group;
    return (
      <li key={`group-${key}`} className="col-span-full basis-full pt-1 first:pt-0">
        <GroupTitle title={state.grouping?.title(key)} count={count} folded={state.folded.includes(key)} onToggle={() => state.toggleFold(key)} />
      </li>
    );
  });
  if (!movable) return <ul className={BOXES[layout]}>{nodes}</ul>;
  // The items of each group in their own list: an item moves within its group only.
  const parts: ReactNode[] = [];
  let group = "";
  let ids: string[] = [];
  let items: ReactNode[] = [];
  const flush = () => {
    if (items.length > 0) {
      parts.push(
        <SortableContext key={`items-${group}`} items={ids} strategy={rectSortingStrategy}>
          {items}
        </SortableContext>,
      );
    }
    [ids, items] = [[], []];
  };
  entries.forEach((entry, index) => {
    if ("row" in entry) {
      ids.push(config.rowId(entry.row));
      items.push(nodes[index]);
    } else {
      flush();
      group = entry.group.key;
      parts.push(nodes[index]);
    }
  });
  flush();
  return <ul className={BOXES[layout]}>{parts}</ul>;
}

interface ItemProps<T> {
  config: DataTableConfig<T>;
  row: T;
  id: string;
  columns: DataTableColumn<T>[];
  /** Its cell before the title: the handle, then the place. */
  order?: DataTableColumn<T>;
  layout: "cards" | "list";
  selected: boolean;
  onToggle: (ids: string[], on: boolean) => void;
  movable: boolean;
  blocked: string | null;
}

/** A row, drawn again only when its own props change, as a row of the table. */
const Item = memo(function Item<T>({ config, row, id, columns, order, layout, selected, onToggle, movable, blocked }: ItemProps<T>) {
  const open = config.onOpen;
  const openFrom = (event: MouseEvent | KeyboardEvent) => {
    // Buttons, links and checkboxes of the item keep their own click.
    if ((event.target as HTMLElement).closest("button, a, [role=checkbox], [role=menuitem]")) return;
    open?.(row);
  };
  return (
    <MovableItem move={movable ? { id, blocked } : undefined} className="min-w-0">
      <ItemFrame
        layout={layout}
        selected={selected}
        muted={config.muted?.(row)}
        onClick={open && openFrom}
        onKeyDown={open && ((event) => event.key === "Enter" && event.target === event.currentTarget && openFrom(event))}
        start={
          <>
            {config.bulkActions && <Checkbox checked={selected} onCheckedChange={(on) => onToggle([id], on)} aria-label="Sélectionner la ligne" />}
            {order && <span className="flex shrink-0 items-center">{order.cell(row)}</span>}
          </>
        }
        end={config.actions?.(row)}
      >
        {columns.map((column, at) => (
          <Value key={column.id} column={column} layout={layout} first={at === 0}>
            {column.cell(row)}
            {column.copy && <CopyButton value={column.copy(row)} />}
          </Value>
        ))}
      </ItemFrame>
    </MovableItem>
  );
}) as <T>(props: ItemProps<T>) => ReactNode;

/** The border of a card or of an item of the list, with the checkbox before the values and the actions after. */
function ItemFrame({
  layout,
  selected,
  muted,
  onClick,
  onKeyDown,
  start,
  end,
  children,
}: {
  layout: "cards" | "list";
  selected?: boolean;
  muted?: boolean;
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  start?: ReactNode;
  end?: ReactNode;
  children: ReactNode[];
}) {
  const [first, ...rest] = children;
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-state={selected ? "selected" : undefined}
      className={cn(
        "border bg-card text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=selected]:bg-muted",
        onClick && "cursor-pointer hover:bg-muted/50",
        muted && "text-muted-foreground",
        layout === "cards" ? "flex h-full flex-col rounded-xl" : "flex max-w-full items-center gap-3 rounded-lg px-2.5 py-1",
      )}
    >
      {layout === "cards" ? (
        <>
          <div className="flex min-h-11 items-center gap-2 border-b px-3 py-1.5">
            {start}
            {first}
            {end && <span className="ml-auto shrink-0">{end}</span>}
          </div>
          {/* Smaller than the title, to hold more in less room. */}
          {rest.length > 0 && <div className="flex flex-col py-1 text-xs">{rest}</div>}
        </>
      ) : (
        <>
          {start}
          {children}
          {end}
        </>
      )}
    </div>
  );
}

/** A value of the item: in a card, on its own line after the icon of its column. */
function Value<T>({ column, layout, first, children }: { column: DataTableColumn<T>; layout: "cards" | "list"; first: boolean; children: ReactNode }) {
  if (first) return <div className={cn("group/cell relative min-w-0 font-medium", layout === "cards" && "flex-1")}>{children}</div>;
  if (layout === "list") return <div className="group/cell relative min-w-0 shrink-0">{children}</div>;
  return (
    <div className="group/cell relative flex min-h-7 items-center gap-2 px-3">
      {/* Its name in the native bubble: a tooltip on every value of the page would slow it. */}
      <span title={column.header} aria-label={column.header} role="img" className="inline-flex shrink-0 text-muted-foreground/70 [&_svg]:size-3">
        {column.icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
