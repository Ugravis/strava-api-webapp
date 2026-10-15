"use client";

import { Grid2x2Icon, Grid3x3Icon, RouteIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TileMode } from "./tile-layers";

const MODES: { mode: TileMode; icon: LucideIcon; labelKey: "none" | "tiles" | "subtiles" }[] = [
  { mode: "none", icon: RouteIcon, labelKey: "none" },
  { mode: "tiles", icon: Grid2x2Icon, labelKey: "tiles" },
  { mode: "subtiles", icon: Grid3x3Icon, labelKey: "subtiles" },
];

/** Segmented control choosing the level of tiles shown over the tracks. */
export function TileModeToggle({ mode, onChange }: { mode: TileMode; onChange: (mode: TileMode) => void }) {
  const t = useTranslations("map.tileMode");

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className="flex rounded-full border bg-background/90 p-0.5 text-xs font-medium shadow-sm backdrop-blur"
    >
      {MODES.map(({ mode: option, icon: Icon, labelKey }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={mode === option}
          onClick={() => onChange(option)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            mode === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
