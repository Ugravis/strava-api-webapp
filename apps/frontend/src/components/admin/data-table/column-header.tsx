"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { DataTableColumn, TableSort } from "./types";

/** A header opening its menu: sort either way, or hide the column. */
export function ColumnHeader<T>({ column, sort, onSort, onHide }: { column: DataTableColumn<T>; sort: TableSort; onSort: (value: TableSort) => void; onHide?: () => void }) {
  if (!column.sortable && !onHide) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-muted-foreground/70 [&_svg]:size-3.5">{column.icon}</span>
        {column.header}
      </span>
    );
  }
  const active = sort.id === column.id;
  const Icon = !active ? ChevronsUpDownIcon : sort.desc ? ArrowDownIcon : ArrowUpIcon;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "group/header -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground",
          active && "text-foreground",
        )}
      >
        <span className="text-muted-foreground/70 transition-colors group-hover/header:text-foreground group-data-popup-open/header:text-foreground [&_svg]:size-3.5">{column.icon}</span>
        {column.header}
        {column.sortable && <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />}
      </DropdownMenuTrigger>
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
