"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Tip } from "./tip";
import type { DataTableColumn, TableSort } from "./types";

/** A header opening its menu: sort either way, or hide the column. */
export function ColumnHeader<T>({ column, sort, disabled, onSort, onHide }: { column: DataTableColumn<T>; sort: TableSort; disabled: boolean; onSort: (value: TableSort) => void; onHide?: () => void }) {
  if (!column.sortable && !onHide) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-muted-foreground/70 [&_svg]:size-3.5">{column.icon}</span>
        <Name column={column} />
      </span>
    );
  }
  const active = sort.id === column.id;
  const Icon = !active ? ChevronsUpDownIcon : sort.desc ? ArrowDownIcon : ArrowUpIcon;
  const trigger = (
    <DropdownMenuTrigger
      disabled={disabled}
      className={cn(
        "group/header -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors outline-none hover:text-foreground disabled:pointer-events-none focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground",
        active && "text-foreground",
      )}
    >
      <span className="text-muted-foreground/70 transition-colors group-hover/header:text-foreground group-data-popup-open/header:text-foreground [&_svg]:size-3.5">{column.icon}</span>
      <Name column={column} />
      {column.sortable && <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />}
    </DropdownMenuTrigger>
  );
  return (
    <DropdownMenu modal={false}>
      {column.compact ? <Tip label={column.header}>{trigger}</Tip> : trigger}
      <DropdownMenuContent className="w-44">
        {column.sortable && (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onSort({ id: column.id, desc: false })}>
              <ArrowUpIcon />
              Croissant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort({ id: column.id, desc: true })}>
              <ArrowDownIcon />
              Décroissant
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
        {column.sortable && onHide && <DropdownMenuSeparator />}
        {onHide && (
          <DropdownMenuItem onClick={onHide}>
            <EyeOffIcon />
            Masquer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The name of the column, told to screen readers only when `compact`. */
function Name<T>({ column }: { column: DataTableColumn<T> }) {
  return column.compact ? <span className="sr-only">{column.header}</span> : column.header;
}
