"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CarouselSlide {
  id: string;
  content: ReactNode;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Native scroll-snap carousel: swipeable and keyboard-scrollable without any library,
 * the buttons and dots only drive the scroll position. The track bleeds to the edges
 * of the window while its first slide lines up with the page content.
 */
export function FeatureCarousel({ slides }: { slides: CarouselSlide[] }) {
  const t = useTranslations("landing.features");
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      const items = [...track.children] as HTMLElement[];
      const origin = items[0]?.offsetLeft ?? 0;
      let nearest = 0;
      items.forEach((item, index) => {
        if (Math.abs(item.offsetLeft - origin - track.scrollLeft) < Math.abs(items[nearest].offsetLeft - origin - track.scrollLeft)) {
          nearest = index;
        }
      });
      const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      // At the end, the last slides may never reach the start: the last one is then the active one.
      setActive(end ? items.length - 1 : nearest);
      setEdges({ start: track.scrollLeft <= 4, end });
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, []);

  const goTo = (index: number) => {
    const track = trackRef.current;
    const items = track ? ([...track.children] as HTMLElement[]) : [];
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    if (!track || !target) return;
    track.scrollTo({ left: target.offsetLeft - items[0].offsetLeft, behavior: scrollBehavior() });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={t("carouselLabel")} className="flex flex-col gap-6">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory scroll-px-(--gutter) gap-4 overflow-x-auto px-(--gutter) pb-2 [--gutter:max(1rem,calc((100%_-_72rem)/2_+_1rem))] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map(({ id, content }, index) => (
          <li
            key={id}
            role="group"
            aria-roledescription="slide"
            aria-label={t("slideLabel", { index: index + 1, total: slides.length })}
            className="w-[85%] shrink-0 snap-start sm:w-[22rem] lg:w-[24rem]"
          >
            {content}
          </li>
        ))}
      </ul>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {slides.map(({ id }, index) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={t("goTo", { index: index + 1 })}
              aria-current={index === active}
              className={cn(
                "h-1.5 rounded-full transition-all motion-reduce:transition-none",
                index === active ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50",
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <CarouselButton label={t("previous")} disabled={edges.start} onClick={() => goTo(active - 1)}>
            <ChevronLeftIcon className="size-5" />
          </CarouselButton>
          <CarouselButton label={t("next")} disabled={edges.end} onClick={() => goTo(active + 1)}>
            <ChevronRightIcon className="size-5" />
          </CarouselButton>
        </div>
      </div>
    </div>
  );
}

function CarouselButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
