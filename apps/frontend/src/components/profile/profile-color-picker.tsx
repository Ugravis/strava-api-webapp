"use client";

import { PipetteIcon, RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { cn } from "@/lib/utils";
import { DEFAULT_PROFILE_COLOR, PROFILE_COLOR_PRESETS } from "./profile-color";

interface ProfileColorPickerProps {
  /** `#rrggbb`; null for the default hue. */
  value: string | null;
  onChange: (color: string | null) => void;
  id?: string;
  className?: string;
}

/** The suggested hues, any other one picked freely, and a way back to the default. */
export function ProfileColorPicker({ value, onChange, id, className }: ProfileColorPickerProps) {
  const t = useTranslations("profile.color");
  const customId = useId();
  const current = (value ?? DEFAULT_PROFILE_COLOR).toLowerCase();
  const custom = !PROFILE_COLOR_PRESETS.some((preset) => preset.value === current);
  const swatch =
    "size-7 shrink-0 rounded-full ring-offset-2 ring-offset-background outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div id={id} className={cn("flex flex-wrap items-center gap-2", className)}>
      <div role="radiogroup" aria-label={t("label")} className="flex flex-wrap gap-2">
        {PROFILE_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            role="radio"
            aria-checked={current === preset.value}
            aria-label={t(`presets.${preset.key}`)}
            title={t(`presets.${preset.key}`)}
            // The default hue is stored as null.
            onClick={() => onChange(preset.value === DEFAULT_PROFILE_COLOR ? null : preset.value)}
            className={cn(swatch, current === preset.value && "ring-2 ring-foreground")}
            style={{ backgroundColor: preset.value }}
          />
        ))}
        <label
          htmlFor={customId}
          title={t("custom")}
          className={cn(
            swatch,
            "relative grid cursor-pointer place-items-center bg-[conic-gradient(#f43f5e,#f59e0b,#22c55e,#14b8a6,#3b82f6,#8b5cf6,#f43f5e)] has-focus-visible:ring-2 has-focus-visible:ring-ring",
            custom && "ring-2 ring-foreground",
          )}
          style={custom ? { background: current } : undefined}
        >
          <PipetteIcon className="size-3.5 text-white drop-shadow" aria-hidden />
          <input
            id={customId}
            type="color"
            value={current}
            onChange={(event) => onChange(event.target.value)}
            aria-label={t("custom")}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={value === null} onClick={() => onChange(null)}>
        <RotateCcwIcon aria-hidden />
        {t("reset")}
      </Button>
    </div>
  );
}
