"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { type ReactNode, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ActionResult } from "./action-state";

/** Rows only move up and down. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface SortableItem {
  id: string;
  content: ReactNode;
}

interface SortableListProps {
  items: SortableItem[];
  /** Saves the new order of the ids; the outcome is told by a toast on failure. */
  action: (ids: string[]) => Promise<ActionResult>;
  /** Name of the drag handle of each row. */
  handleLabel: string;
  className?: string;
}

function SortableRow({ item, handleLabel }: { item: SortableItem; handleLabel: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("flex items-center gap-1 bg-card", isDragging && "relative z-10 rounded-lg shadow-lg")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={handleLabel}
        className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{item.content}</div>
    </li>
  );
}

/**
 * Rows moved by drag and drop, from their handle, with the mouse, a finger
 * or the keyboard. The new order shows at once and is then saved; it is
 * undone if the save fails. Generic: its texts come from the caller.
 */
export function SortableList({ items, action, handleLabel, className }: SortableListProps) {
  // Stable across server and browser renders, unlike the ids dnd-kit counts.
  const id = useId();
  const [moved, setMoved] = useState<string[] | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byId = new Map(items.map((item) => [item.id, item]));
  // The order moved to, until the refreshed items carry it.
  const ids = moved?.every((id) => byId.has(id)) && moved.length === items.length ? moved : items.map((item) => item.id);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setMoved(next);
    startTransition(async () => {
      const result = await action(next);
      if (!result.ok) {
        toast.error(result.message);
      }
      setMoved(null);
    });
  };

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {ids.map((id) => (
            <SortableRow key={id} item={byId.get(id)!} handleLabel={handleLabel} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
