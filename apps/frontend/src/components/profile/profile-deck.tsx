"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { cn } from "@/lib/utils";
import { CARD_WIDTH } from "./profile-stage";

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
  /**
   * A card shown in front of the deck, which is then blurred and left still,
   * with what goes under it in place of the chevrons; a click on the deck
   * calls `onBack`.
   */
  front?: { content: ReactNode; footer: ReactNode; onBack?: () => void };
}

/** Drag past which a swipe changes the card. */
const SWIPE_PX = 50;

/**
 * Transform of a card by its place from the shown one: behind it, leaning
 * out on each side, then hidden further out. The hidden ones stay rendered,
 * so that a card coming in slides from there instead of popping up.
 */
const PLACES: Record<number, string> = {
  [-2]: "-translate-x-[28%] -rotate-6 scale-75 opacity-0",
  [-1]: "-translate-x-[16%] -rotate-3 scale-90 opacity-60",
  0: "",
  1: "translate-x-[16%] rotate-3 scale-90 opacity-60",
  2: "translate-x-[28%] rotate-6 scale-75 opacity-0",
};

/**
 * Stacked cards: the shown one in front, the previous and next ones peeking
 * behind it on each side, in a loop. Changed by the chevrons, a click on a
 * card behind, a swipe or the arrow keys.
 */
export function ProfileDeck({ items, index, onIndexChange, front }: ProfileDeckProps) {
  const t = useTranslations("profile.deck");
  const count = items.length;
  // The deck is still behind a card in front.
  const movable = !front && count > 1;
  const dragStart = useRef<number | null>(null);
  const go = (step: number) => onIndexChange((index + step + count) % count);
  /** Shortest way from the shown card, around the loop. */
  const placeOf = (itemIndex: number) => {
    const offset = (itemIndex - index + count) % count;
    return offset > count / 2 ? offset - count : offset;
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("label")}
      className="flex w-full flex-col items-center gap-3"
      onKeyDown={(event) => {
        if (!movable || event.target !== event.currentTarget) return;
        if (event.key === "ArrowLeft") go(-1);
        if (event.key === "ArrowRight") go(1);
      }}
      tabIndex={movable ? 0 : undefined}
    >
      <div
        className={cn("relative grid grid-cols-[minmax(0,1fr)] touch-pan-y", CARD_WIDTH)}
        onPointerDown={(event) => {
          dragStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (dragStart.current === null || !movable) return;
          const dragged = event.clientX - dragStart.current;
          dragStart.current = null;
          if (Math.abs(dragged) > SWIPE_PX) go(dragged < 0 ? 1 : -1);
        }}
      >
        {items.map((item, itemIndex) => {
          const place = placeOf(itemIndex);
          if (Math.abs(place) > 2) return null;
          const peeking = Math.abs(place) === 1;
          return (
            <div
              key={item.key}
              // All the cards share the one cell of the grid, stretched to the tallest: they all have its size.
              className={cn(
                "relative col-start-1 row-start-1 transition-[translate,rotate,scale,opacity,filter] duration-300 ease-out will-change-transform motion-reduce:transition-none",
                place === 0 ? "z-20" : peeking ? "z-10" : "pointer-events-none z-0",
                PLACES[place],
                front && "cursor-pointer blur-[3px]",
              )}
              onClick={front?.onBack}
              aria-hidden={place !== 0 || front !== undefined}
            >
              <div inert={place !== 0 || front !== undefined} className="h-full">
                {item.content}
              </div>
              {peeking && !front && (
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
        {front && <div className="relative z-30 col-start-1 row-start-1">{front.content}</div>}
      </div>
      {front?.footer}
      {movable && (
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
