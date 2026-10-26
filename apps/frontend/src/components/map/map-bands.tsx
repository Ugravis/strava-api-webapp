"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { cn } from "@/lib/utils";

/** Height of the bands over the bottom of the map, set on their parent for the map and its panel. */
export const BANDS_HEIGHT_VAR = "--map-bands-height";

/**
 * Bands over the bottom of the map, folded together by a handle on their
 * top edge, like the side panel. The map keeps its size behind them, so that
 * folding does not move it: their height, set on the parent as
 * `--map-bands-height`, keeps its controls and panel above them.
 */
export function MapBands({ children }: { children: ReactNode }) {
  const t = useTranslations("map.bands");
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bands = ref.current;
    const parent = bands?.parentElement;
    if (!bands || !parent) return;
    // Outside React: the height changes on every frame while folding.
    const observer = new ResizeObserver(() => parent.style.setProperty(BANDS_HEIGHT_VAR, `${bands.offsetHeight}px`));
    observer.observe(bands);
    return () => {
      observer.disconnect();
      parent.style.removeProperty(BANDS_HEIGHT_VAR);
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-x-0 bottom-0 z-20">
      {/* Discreet over the open bands, larger once folded, to find it again. */}
      <Button
        variant="outline"
        size="icon-xs"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t("expand") : t("collapse")}
        className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-b-none border-b-0 bg-background shadow-md",
          collapsed ? "-top-7 h-7 w-12" : "-top-4 h-4 w-9 [&_svg:not([class*='size-'])]:size-3",
        )}
      >
        {collapsed ? <ChevronUpIcon aria-hidden /> : <ChevronDownIcon aria-hidden />}
      </Button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={collapsed}>
          {children}
        </div>
      </div>
    </div>
  );
}
