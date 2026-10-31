"use client";

import type { TablePage } from "@kilotrace/shared/table";
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, InboxIcon, SearchXIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { memo, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { TableCheckbox } from "./cells/checkbox";
import { Separator } from "@/components/ui/separator";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CopyButton, drawCell } from "./cells/base";
import { MovableRow } from "./reorder";
import type { DataTableColumn, DataTableConfig } from "./types";

interface RowProps<T> {
  config: DataTableConfig<T>;
  row: T;
  id: string;
  columns: DataTableColumn<T>[];
  selected: boolean;
  pinBox: string;
  pinFirst: string;
  onToggle: (ids: string[], on: boolean) => void;
  /** Dragged by its handle, unless `blocked` says why not. */
  movable?: boolean;
  blocked?: string | null;
}

/** A row, drawn again only when its own props change, not on every change of the table. */
export const DataTableRow = memo(function DataTableRow<T>({ config, row, id, columns, selected, pinBox, pinFirst, onToggle, movable, blocked = null }: RowProps<T>) {
  return (
    <MovableRow
      move={movable ? { id, blocked } : undefined}
      data-state={selected ? "selected" : undefined}
      onClick={(event) => {
        // Buttons, links and checkboxes of the row keep their own click.
        if ((event.target as HTMLElement).closest("button, a, [role=checkbox], [role=menuitem]")) return;
        config.onOpen?.(row);
      }}
      className={cn("group/row", config.onOpen && "cursor-pointer", config.muted?.(row) && "text-muted-foreground")}
    >
      {config.bulkActions && (
        <TableCell className={cn(pinBox, "w-10")}>
          <TableCheckbox checked={selected} onCheckedChange={(on) => onToggle([id], on)} aria-label="Sélectionner la ligne" />
        </TableCell>
      )}
      {columns.map((column, index) => (
        <TableCell key={column.id} className={cn("group/cell relative", index === 0 && pinFirst, column.className)}>
          {drawCell(column, row)}
          {column.copy && <CopyButton value={column.copy(row)} />}
        </TableCell>
      ))}
      {config.actions && <TableCell className="w-px text-center">{config.actions(row)}</TableCell>}
    </MovableRow>
  );
}) as <T>(props: RowProps<T>) => ReactNode;

/** Nothing to show: an empty table, filters matching nothing, or a failed call. */
export function EmptyState({
  error,
  filtered,
  empty,
  onRetry,
  onClear,
}: {
  error: boolean;
  filtered: boolean;
  empty: { title: string; description: string };
  onRetry: () => void;
  onClear: () => void;
}) {
  const Icon = error ? TriangleAlertIcon : filtered ? SearchXIcon : InboxIcon;
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
      <span className={cn("flex size-10 items-center justify-center rounded-full bg-muted", error && "bg-destructive/10 text-destructive")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium">{error ? "Chargement impossible" : filtered ? "Aucun résultat" : empty.title}</p>
      <p className="text-sm text-muted-foreground">
        {error ? "L'API n'a pas répondu. Réessaie dans un instant." : filtered ? "Aucune ligne ne correspond à ces filtres." : empty.description}
      </p>
      {(error || filtered) && (
        <Button variant="outline" size="sm" className="mt-1" onClick={error ? onRetry : onClear}>
          {error ? "Réessayer" : "Effacer les filtres"}
        </Button>
      )}
    </div>
  );
}

/** « 31–60 sur 412 comptes », and the pages: first, previous, typed, next, last. */
export function Pagination({ pager, loading, noun, onPage }: { pager: TablePage<unknown>; loading: boolean; noun: (count: number) => string; onPage: (value: number) => void }) {
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground", loading && "pointer-events-none opacity-60")}>
      <p>
        {pager.before + 1}–{pager.before + pager.entries.filter((entry) => "row" in entry).length} sur {pager.visible} {noun(pager.visible)}
        {pager.visible < pager.total && ` (${pager.total - pager.visible} repliés)`}
      </p>
      <div className="flex items-center gap-1">
        <Button size="icon-xs" variant="ghost" disabled={loading || pager.page === 1} onClick={() => onPage(1)} aria-label="Première page">
          <ChevronsLeftIcon />
        </Button>
        <Button size="icon-xs" variant="ghost" disabled={loading || pager.page === 1} onClick={() => onPage(pager.page - 1)} aria-label="Page précédente">
          <ChevronLeftIcon />
        </Button>
        <span className="flex items-center gap-1.5 px-1">
          Page
          <PageInput key={pager.page} disabled={loading} page={pager.page} pages={pager.pages} onPage={onPage} />
          sur {pager.pages}
        </span>
        <Button size="icon-xs" variant="ghost" disabled={loading || pager.page === pager.pages} onClick={() => onPage(pager.page + 1)} aria-label="Page suivante">
          <ChevronRightIcon />
        </Button>
        <Button size="icon-xs" variant="ghost" disabled={loading || pager.page === pager.pages} onClick={() => onPage(pager.pages)} aria-label="Dernière page">
          <ChevronsRightIcon />
        </Button>
      </div>
    </nav>
  );
}

/** The page typed in, applied on Enter or on leaving, kept within bounds. */
function PageInput({ page, pages, disabled, onPage }: { page: number; disabled: boolean; pages: number; onPage: (value: number) => void }) {
  const [text, setText] = useState(String(page));
  function apply() {
    const value = Math.min(Math.max(Math.round(Number(text)) || page, 1), pages);
    setText(String(value));
    onPage(value);
  }
  return (
    <input
      inputMode="numeric"
      disabled={disabled}
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

/** Floats at the bottom of the screen while rows are selected, with the bulk actions. */
export function SelectionBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div role="toolbar" aria-label="Sélection" className="flex items-center gap-1 rounded-xl border bg-popover p-1.5 pl-3 text-sm shadow-lg">
        <span className="font-medium tabular-nums">
          {count} sélectionné{count > 1 ? "s" : ""}
        </span>
        <Separator orientation="vertical" className="mx-1.5 h-5" />
        {children}
        <Button size="icon-sm" variant="ghost" onClick={onClear} aria-label="Tout désélectionner">
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
