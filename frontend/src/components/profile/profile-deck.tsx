"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DeckItem {
  key: string;
  /** Who the card belongs to, to name the buttons showing it. */
  label: string;
  content: ReactNode;
}

interface ProfileDeckProps {
  items: DeckItem[];
  index: number;
  onIndexChange: (index: number) => void;
}

/** Drag past which a swipe changes the card. */
const SWIPE_PX = 50;

/** Transform of a card by its place from the shown one: behind it, leaning out on each side. */
const PLACES: Record<-1 | 0 | 1, string> = {
  [-1]: "-translate-x-[16%] -rotate-3 scale-90 opacity-60",
  0: "",
  1: "translate-x-[16%] rotate-3 scale-90 opacity-60",
};

/**
 * Stacked cards: the shown one in front, the previous and next ones peeking
 * behind it on each side, in a loop. Changed by the chevrons, a click on a
 * card behind, a swipe or the arrow keys.
 */
export function ProfileDeck({ items, index, onIndexChange }: ProfileDeckProps) {
  const t = useTranslations("profile.deck");
  const count = items.length;
  const dragStart = useRef<number | null>(null);
  const go = (step: number) => onIndexChange((index + step + count) % count);
  // With two cards, the other one peeks on the right only.
  const placeOf = (itemIndex: number): -1 | 0 | 1 | null => {
    const offset = (itemIndex - index + count) % count;
    if (offset === 0) return 0;
    if (offset === 1) return 1;
    if (offset === count - 1 && count > 2) return -1;
    return null;
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("label")}
      className="flex w-full flex-col items-center gap-3"
      onKeyDown={(event) => {
        if (count < 2 || event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft") go(-1);
        if (event.key === "ArrowRight") go(1);
      }}
      tabIndex={count > 1 ? 0 : undefined}
    >
      <div
        className="relative grid w-[88%] max-w-sm grid-cols-[minmax(0,1fr)] touch-pan-y sm:w-full"
        onPointerDown={(event) => {
          dragStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (dragStart.current === null || count < 2) return;
          const dragged = event.clientX - dragStart.current;
          dragStart.current = null;
          if (Math.abs(dragged) > SWIPE_PX) go(dragged < 0 ? 1 : -1);
        }}
      >
        {items.map((item, itemIndex) => {
          const place = placeOf(itemIndex);
          if (place === null) return null;
          return (
            <div
              key={item.key}
              // All the cards share the one cell of the grid, stretched to the tallest: they all have its size.
              className={cn(
                "relative col-start-1 row-start-1 transition-[translate,rotate,scale,opacity] duration-300 ease-out motion-reduce:transition-none",
                place === 0 ? "z-20" : "z-10",
                PLACES[place],
              )}
              aria-hidden={place !== 0}
            >
              <div inert={place !== 0} className="h-full">
                {item.content}
              </div>
              {place !== 0 && (
                <button
                  type="button"
                  className="absolute inset-0 cursor-pointer rounded-xl"
                  onClick={() => go(place)}
                  aria-label={t("show", { name: item.label })}
                  tabIndex={-1}
                />
              )}
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label={t("previous")}>
            <ChevronLeftIcon />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {t("position", { index: index + 1, count })}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label={t("next")}>
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </section>
  );
}
