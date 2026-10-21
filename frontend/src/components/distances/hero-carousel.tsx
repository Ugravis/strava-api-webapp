"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** How long a slide stays before the next one. */
const SLIDE_MS = 7000;
/** Longest frame counted, so that a throttled tab does not skip a slide at once. */
const MAX_FRAME_MS = 100;

export interface HeroSlide {
  id: string;
  title: string;
  content: ReactNode;
}

/**
 * Slides going by on their own, the indicator of the current one filling up until the next.
 * The slide holds while the keyboard focus is inside it.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("distances.hero.carousel");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const fillRef = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  const count = slides.length;
  const current = Math.min(index, count - 1);

  const goTo = (position: number) => {
    elapsed.current = 0;
    setIndex((position + count) % count);
  };

  // Fills the indicator frame by frame, without rendering, then moves on to the next slide.
  useEffect(() => {
    if (count < 2 || paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += Math.min(now - last, MAX_FRAME_MS);
      last = now;
      const share = Math.min(elapsed.current / SLIDE_MS, 1);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${share})`;
      if (share < 1) frame = requestAnimationFrame(tick);
      else {
        elapsed.current = 0;
        setIndex((position) => (position + 1) % count);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [count, paused, current]);

  const arrow = "size-8 flex-none rounded-full text-white/40 hover:bg-white/10 hover:text-white";

  return (
    <section
      aria-roledescription={t("role")}
      aria-label={slides[current]?.title}
      className="flex flex-col gap-2"
      onFocus={(event) => setPaused(event.target.matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <h2 className="text-xs font-medium text-white/60">{slides[current]?.title}</h2>
      <div className="flex items-center gap-1">
        {count > 1 && (
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            aria-label={t("previous")}
            className={cn("-ml-2 grid place-items-center outline-none focus-visible:ring-3 focus-visible:ring-white/40", arrow)}
          >
            <ChevronLeftIcon className="size-4" />
          </button>
        )}
        <div className="-mx-2 min-w-0 flex-1 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide, position) => (
              <div
                key={slide.id}
                role="group"
                aria-roledescription={t("slide")}
                aria-label={t("position", { position: position + 1, count })}
                inert={position !== current}
                className="w-full flex-none px-2"
              >
                {slide.content}
              </div>
            ))}
          </div>
        </div>
        {count > 1 && (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            aria-label={t("next")}
            className={cn("-mr-2 grid place-items-center outline-none focus-visible:ring-3 focus-visible:ring-white/40", arrow)}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        )}
      </div>
      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((slide, position) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(position)}
              aria-label={t("goTo", { title: slide.title })}
              aria-current={position === current}
              className="grid h-4 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-white/40"
            >
              <span
                className={cn(
                  "block h-1.5 overflow-hidden rounded-full bg-white/25 transition-[width] duration-300",
                  position === current ? "w-6" : "w-1.5 hover:bg-white/40",
                )}
              >
                {position === current && (
                  <span
                    // A new element on each slide, filling up from zero.
                    key={current}
                    ref={fillRef}
                    className="block size-full origin-left rounded-full bg-white"
                    style={{ transform: "scaleX(0)" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
