"use client";

import { Grid2x2Icon, LayersIcon, RouteIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TileMode } from "./tile-layers";

const MODES: { mode: TileMode; icon: LucideIcon }[] = [
  { mode: "none", icon: RouteIcon },
  { mode: "tiles", icon: Grid2x2Icon },
  { mode: "both", icon: LayersIcon },
];

/**
 * Segmented control choosing the levels of tiles shown over the tracks. On
 * narrow screens, only the selected option keeps its label.
 */
export function TileModeToggle({ mode, onChange }: { mode: TileMode; onChange: (mode: TileMode) => void }) {
  const t = useTranslations("map.tileMode");

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className="flex rounded-full border bg-background/90 p-0.5 text-xs font-medium shadow-sm backdrop-blur"
    >
      {MODES.map(({ mode: option, icon: Icon }) => {
        const selected = mode === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(option)}
            title={t(option)}
            onClick={() => onChange(option)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className={cn(!selected && "hidden sm:inline")}>{t(option)}</span>
          </button>
        );
      })}
    </div>
  );
}
