"use client";

import { PipetteIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SAVE_BUTTON } from "./field-buttons";

/** The hues offered first, those of the marks of the site. */
export const COLOR_PRESETS = [
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669", "#0d9488", "#0891b2",
  "#0284c7", "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777", "#e11d48", "#64748b",
];
const HEX = /^#[0-9a-f]{6}$/i;

/** Swatches, any other hue by the pipette or its code: saved by « Valider » only. */
export function ColorPicker({
  presets,
  noneLabel,
  value,
  disabled,
  onChange,
  onDone,
}: {
  presets: string[];
  noneLabel?: string;
  value: string | null;
  disabled?: boolean;
  onChange: (color: string | null) => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState(value ?? "");
  const current = value?.toLowerCase() ?? null;
  const set = (color: string | null) => {
    setCode(color ?? "");
    onChange(color && color.toLowerCase());
  };

  return (
    <>
      <div role="radiogroup" aria-label="Couleurs proposées" className="grid grid-cols-9 gap-1.5 p-1">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={current === color}
            aria-label={color}
            title={color}
            disabled={disabled}
            onClick={() => set(color)}
            className={cn(
              "aspect-square rounded-full ring-offset-2 ring-offset-popover outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              current === color && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label
          title="Autre couleur"
          className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-md bg-[conic-gradient(#f43f5e,#f59e0b,#22c55e,#14b8a6,#3b82f6,#8b5cf6,#f43f5e)] ring-1 ring-foreground/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          style={current && !presets.includes(current) ? { background: current } : undefined}
        >
          <PipetteIcon className="size-3.5 text-white drop-shadow" aria-hidden />
          <input type="color" value={current ?? "#000000"} disabled={disabled} onChange={(event) => set(event.target.value)} aria-label="Autre couleur" className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
        <Input
          value={code}
          disabled={disabled}
          onChange={(event) => {
            setCode(event.target.value);
            if (HEX.test(event.target.value)) onChange(event.target.value.toLowerCase());
          }}
          onKeyDown={(event) => event.key === "Enter" && HEX.test(code) && onDone()}
          placeholder="#rrggbb"
          aria-label="Code de la couleur"
          aria-invalid={code !== "" && !HEX.test(code)}
          className="h-8 font-mono text-sm"
        />
        <Button size="sm" className={SAVE_BUTTON} disabled={disabled} onClick={onDone}>
          Valider
        </Button>
      </div>
      {noneLabel && (
        <Button size="sm" variant="ghost" disabled={disabled || value === null} onClick={() => set(null)}>
          {noneLabel}
        </Button>
      )}
    </>
  );
}
