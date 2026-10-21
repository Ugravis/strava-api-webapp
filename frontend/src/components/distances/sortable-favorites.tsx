"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BADGE_CARD_CLASS, BADGE_LAYOUT_CLASS, BadgeCardContent, type BadgeLayout } from "./badge-card-content";
import { BADGE_GRIDS } from "./badge-grid";

interface SortableFavoritesProps {
  /** Favorites, in their order. */
  badges: DistanceBadge[];
  onReorder: (badgeIds: string[]) => void;
  layout: BadgeLayout;
}

function SortableBadge({ badge, index, layout }: { badge: DistanceBadge; index: number; layout: BadgeLayout }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: badge.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex cursor-grab touch-none outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
        BADGE_CARD_CLASS,
        BADGE_LAYOUT_CLASS[layout],
        isDragging && "relative z-10 cursor-grabbing shadow-lg",
      )}
      {...attributes}
      {...listeners}
    >
      <BadgeCardContent badge={badge} layout={layout} index={index} showFamily />
    </li>
  );
}

/** Favorites moved by drag and drop, with the mouse, a finger or the keyboard. */
export function SortableFavorites({ badges, onReorder, layout }: SortableFavoritesProps) {
  const t = useTranslations("distances.favoritesSection.drag");
  const sensors = useSensors(
    // A short move starts the drag: a tap still focuses the badge.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = badges.map((badge) => badge.id);
  const nameOf = (id: string | number) => badges.find((badge) => badge.id === id)?.name ?? String(id);
  const rankOf = (id: string | number | undefined) => (id === undefined ? 0 : ids.indexOf(String(id)) + 1);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: t("instructions") },
        announcements: {
          onDragStart: ({ active }) => t("start", { name: nameOf(active.id), rank: rankOf(active.id) }),
          onDragOver: ({ active, over }) => t("over", { name: nameOf(active.id), rank: rankOf(over?.id) }),
          onDragEnd: ({ active, over }) => t("end", { name: nameOf(active.id), rank: rankOf(over?.id) }),
          onDragCancel: ({ active }) => t("cancel", { name: nameOf(active.id) }),
        },
      }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <ul className={BADGE_GRIDS[layout].className}>
          {badges.map((badge, index) => (
            <SortableBadge key={badge.id} badge={badge} index={index} layout={layout} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
