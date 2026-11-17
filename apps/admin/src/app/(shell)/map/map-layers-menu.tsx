"use client";

import type { LayerGroup } from "@kilotrace/ui/lib/map/stations-layer";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { Switch } from "@kilotrace/ui/components/ui/switch";
import { cn } from "@kilotrace/ui/lib/utils";
import { LayersIcon, PinIcon } from "lucide-react";
import { useId, useState } from "react";

/** What the panel shows: the groups of layers, the countries, and the dots forced at every zoom. */
export interface MapLayersState {
  hidden: ReadonlySet<LayerGroup | "countries">;
  everyDot: boolean;
}

export const DEFAULT_LAYERS: MapLayersState = { hidden: new Set(), everyDot: false };

const SHOWN: { key: LayerGroup | "countries"; label: string }[] = [
  { key: "rails", label: "Voies" },
  { key: "stations", label: "Gares visibles" },
  { key: "hidden", label: "Gares masquées" },
  { key: "zones", label: "Zones et emprises" },
  { key: "countries", label: "Régions" },
];

function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4 py-1.5">
      <span className="min-w-0 text-sm">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/** Panel docked bottom left of the dataset map, folded: opens on hover, kept open once pinned. Shows or hides its parts. */
export function MapLayersMenu({ value, onChange }: { value: MapLayersState; onChange: (next: MapLayersState) => void }) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Opened by the focus too, for the keyboard; the pointer leaving closes it all the same, after a click inside.
  const [focused, setFocused] = useState(false);
  const open = pinned || hovered || focused;
  const toggle = (key: LayerGroup | "countries", on: boolean) => {
    const hidden = new Set(value.hidden);
    if (on) hidden.delete(key);
    else hidden.add(key);
    onChange({ ...value, hidden });
  };
  const changed = value.hidden.size > 0 || value.everyDot;
  return (
    <section
      className="absolute bottom-2.5 left-2.5 z-10 w-72 max-w-[calc(100%-1.25rem)] rounded-lg border bg-background/95 shadow-md backdrop-blur-sm"
      aria-label="Calques"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setFocused(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <header className="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
        <LayersIcon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Calques</h2>
        {changed && <span className="size-1.5 rounded-full bg-primary" aria-label="modifiés" />}
        <Button
          className="ml-auto"
          variant={pinned ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => setPinned(!pinned)}
          aria-label={pinned ? "Désépingler" : "Épingler ouvert"}
          aria-pressed={pinned}
        >
          <PinIcon />
        </Button>
      </header>
      {/* Unfolds and folds in height; out of reach of the keyboard while folded. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t px-3 py-1.5">
            {SHOWN.map(({ key, label }) => (
              <Row key={key} label={label} checked={!value.hidden.has(key)} onChange={(on) => toggle(key, on)} />
            ))}
            <Separator className="my-1.5" />
            <Row
              label="Forcer toutes les gares"
              checked={value.everyDot}
              onChange={(everyDot) => onChange({ ...value, everyDot })}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
