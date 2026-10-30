"use client";

import { MoreHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Tip } from "../tip";

/** Shown only on hover where a pointer hovers, always on touch screens. */
const ON_HOVER =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100";

/** Buttons side by side in a cell, e.g. a column of quick actions. */
export function CellButtons({ children }: { children: ReactNode }) {
  return <span className="flex items-center gap-1">{children}</span>;
}

/**
 * A quick action of a row: an icon alone with its name in a bubble, or the
 * icon and `text`. A click on it does not open the row.
 */
export function CellButton({
  label,
  icon,
  text,
  destructive,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  text?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  const tone = destructive && "text-destructive hover:text-destructive";
  if (text) {
    return (
      <Button size="xs" variant="outline" className={cn(tone)} onClick={onClick}>
        <span data-icon="inline-start" className="contents">
          {icon}
        </span>
        {label}
      </Button>
    );
  }
  return (
    <Tip label={label}>
      <Button size="icon-xs" variant="outline" aria-label={label} className={cn(tone)} onClick={onClick}>
        {icon}
      </Button>
    </Tip>
  );
}

/**
 * The menu of a row, at its end: a « … » shown on hover, opening its
 * `DropdownMenuItem`s centred under it. For `config.actions`.
 */
export function RowActions({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" className={ON_HOVER} aria-label={label} />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
