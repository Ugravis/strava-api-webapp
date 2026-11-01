"use client";

import { SearchIcon } from "lucide-react";
import { createElement, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * Every icon of Lucide by its name, loaded in a chunk of their own the first
 * time one is drawn: the bundle of the page holds none of them.
 */

type Lucide = typeof import("./lucide-icons");

/** Drawn at most at once: the search narrows the others down. */
const SHOWN = 96;

let loaded: Lucide | null = null;
let loading: Promise<Lucide> | null = null;

/** The icons of Lucide, null until their chunk is in. */
function useLucide() {
  const [lucide, setLucide] = useState(loaded);
  useEffect(() => {
    if (lucide) return;
    loading ??= import("./lucide-icons").then((module) => (loaded = module));
    let live = true;
    void loading.then((module) => live && setLucide(module));
    return () => {
      live = false;
    };
  }, [lucide]);
  return lucide;
}

/** A Lucide icon by its name, e.g. `rocket` or `grid-3x3`; an empty square while it loads or when unknown. */
export function LucideIconByName({ name, className }: { name: string; className?: string }) {
  const lucide = useLucide();
  const Icon = lucide?.LUCIDE.byKey.get(lucide.iconKey(name));
  if (!Icon) return <span className={cn("size-3.5 rounded-sm bg-muted-foreground/15", className)} aria-hidden />;
  // A component of the registry, not one made during the render.
  return createElement(Icon, { className, "aria-hidden": true });
}

/** A search bar and the grid of the icons whose name holds every word typed; a click picks one. */
export function IconGrid({ value, disabled, onPick }: { value: string | null; disabled?: boolean; onPick: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const lucide = useLucide();
  const found = useMemo(() => {
    const names = lucide?.LUCIDE.names ?? [];
    const words = query.trim().toLowerCase().split(/[\s-]+/).filter(Boolean);
    return words.length === 0 ? names : names.filter((name) => words.every((word) => name.includes(word)));
  }, [lucide, query]);
  // The icon picked first, so that it shows without a search.
  const picked = value && lucide ? found.find((name) => lucide.iconKey(name) === lucide.iconKey(value)) : undefined;
  const shown = (picked ? [picked, ...found.filter((name) => name !== picked)] : found).slice(0, SHOWN);
  const isPicked = (name: string) => name === picked;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une icône" aria-label="Rechercher une icône" className="h-8 pl-8 text-sm" />
      </div>
      {!lucide ? (
        <div className="grid grid-cols-8 gap-1" aria-hidden>
          {Array.from({ length: 32 }, (_, at) => (
            <span key={at} className="aspect-square animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune icône</p>
      ) : (
        <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
          {shown.map((name) => (
            <Tooltip key={name}>
              <TooltipTrigger
                delay={400}
                render={
                  <button
                    type="button"
                    aria-label={name}
                    aria-pressed={isPicked(name)}
                    disabled={disabled}
                    onClick={() => onPick(name)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 [&_svg]:size-4",
                      isPicked(name) && "bg-primary/10 text-primary ring-1 ring-primary/40",
                    )}
                  >
                    <LucideIconByName name={name} />
                  </button>
                }
              />
              <TooltipContent>{name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
      <p className={cn("text-xs text-muted-foreground", !lucide && "invisible")}>
        {found.length > SHOWN ? `${SHOWN} sur ${found.length} icônes : précisez la recherche.` : `${found.length} icône${found.length > 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
