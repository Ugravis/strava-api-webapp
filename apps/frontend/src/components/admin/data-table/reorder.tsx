"use client";

import type { Modifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useContext } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Tip } from "./tip";

/** Rows only move up and down. */
export const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** The handle of the row, for its order cell; none out of a table that moves its rows. */
const HandleContext = createContext<ReactNode>(null);

/** A row of the table, dragged by the handle of its order cell with `move`. */
export function MovableRow({ move, ...props }: ComponentProps<"tr"> & { move?: { id: string; blocked: string | null } }) {
  return move ? <SortableTableRow {...props} {...move} /> : <TableRow {...props} />;
}

/** An item of the cards or of the list, dragged by the handle before its title with `move`. */
export function MovableItem({ move, className, children }: { move?: { id: string; blocked: string | null }; className?: string; children: ReactNode }) {
  return move ? (
    <SortableItem {...move} className={className}>
      {children}
    </SortableItem>
  ) : (
    <li className={className}>{children}</li>
  );
}

/** The sortable node and its handle, built beside the hook: the order cell only places it. */
function useMove(id: string, blocked: string | null) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: blocked !== null });
  const grip = <GripVerticalIcon className="size-3.5" />;
  const handle = blocked ? (
    <Tip label={blocked}>
      <button type="button" aria-disabled aria-label="Déplacer" className="-my-1 flex h-6 w-4 shrink-0 cursor-not-allowed items-center justify-center rounded-md text-muted-foreground/40">
        {grip}
      </button>
    </Tip>
  ) : (
    <button
      ref={setActivatorNodeRef}
      type="button"
      aria-label="Déplacer"
      className="-my-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {grip}
    </button>
  );
  return { setNodeRef, style: { transform: CSS.Translate.toString(transform), transition }, isDragging, handle };
}

function SortableTableRow({ id, blocked, className, style, children, ...props }: ComponentProps<"tr"> & { id: string; blocked: string | null }) {
  const { setNodeRef, style: moved, isDragging, handle } = useMove(id, blocked);
  return (
    <HandleContext value={handle}>
      <tr
        ref={setNodeRef}
        data-slot="table-row"
        style={{ ...style, ...moved }}
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

function SortableItem({ id, blocked, className, children }: { id: string; blocked: string | null; className?: string; children: ReactNode }) {
  const { setNodeRef, style, isDragging, handle } = useMove(id, blocked);
  return (
    <HandleContext value={handle}>
      <li ref={setNodeRef} style={style} className={cn(className, isDragging && "relative z-30 *:shadow-lg")}>
        {children}
      </li>
    </HandleContext>
  );
}

/** The place of the row, small and light after the handle that moves it. */
export function OrderCell({ value }: { value: number | null | undefined }) {
  const handle = useContext(HandleContext);
  return (
    <span className="inline-flex items-center gap-0.5">
      {handle}
      {value !== null && value !== undefined && <span className="text-[11px] leading-none text-muted-foreground/70 tabular-nums">{value}</span>}
    </span>
  );
}
