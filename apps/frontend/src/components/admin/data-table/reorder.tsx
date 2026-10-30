"use client";

import type { Modifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useContext } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { NumberCell } from "./cells/values";
import { Tip } from "./tip";

/** Rows only move up and down. */
export const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** The handle of the row, for its order cell; none out of a table that moves its rows. */
const HandleContext = createContext<ReactNode>(null);

/** A row of the table, dragged by the handle of its order cell with `move`. */
export function MovableRow({ move, ...props }: ComponentProps<"tr"> & { move?: { id: string; blocked: string | null } }) {
  return move ? <SortableTableRow {...props} {...move} /> : <TableRow {...props} />;
}

function SortableTableRow({ id, blocked, className, style, children, ...props }: ComponentProps<"tr"> & { id: string; blocked: string | null }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: blocked !== null });
  const grip = <GripVerticalIcon className="size-4" />;
  // Built here, beside the hook: the order cell only places it.
  const handle = blocked ? (
    <Tip label={blocked}>
      <button type="button" aria-disabled aria-label="Déplacer" className="-my-1 flex h-6 w-5 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/40">
        {grip}
      </button>
    </Tip>
  ) : (
    <button
      ref={setActivatorNodeRef}
      type="button"
      aria-label="Déplacer"
      className="-my-1 flex h-6 w-5 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {grip}
    </button>
  );
  return (
    <HandleContext value={handle}>
      <tr
        ref={setNodeRef}
        data-slot="table-row"
        style={{ ...style, transform: CSS.Translate.toString(transform), transition }}
        className={cn(
          "border-b border-border/60 bg-background transition-colors hover:bg-muted has-aria-expanded:bg-muted data-[state=selected]:bg-muted",
          isDragging && "relative z-30 bg-muted shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
      </tr>
    </HandleContext>
  );
}

/** The place of the row, after the handle that moves it. */
export function OrderCell({ value }: { value: number | null | undefined }) {
  const handle = useContext(HandleContext);
  return (
    <span className="inline-flex items-center gap-1">
      {handle}
      <NumberCell value={value} zero />
    </span>
  );
}
