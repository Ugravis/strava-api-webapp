"use client";

import { ChevronDownIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useListNavigation } from "./list-navigation";

const SEARCH_DELAY_MS = 300;

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

/** A value of the URL; its first option is the default, left out of the URL. */
interface Choice {
  param: string;
  label: string;
  options: Option[];
}

interface ListToolbarProps {
  /** The list itself: a change of filter leaves any panel opened above it. */
  basePath: string;
  /** Searched as typed, under `q`. */
  search?: { label: string };
  selects?: Choice[];
  /** Few values side by side, as text or, given an icon, as icons. */
  toggles?: Choice[];
}

/**
 * Search and filters of a back-office list, kept in the URL, in a frame of
 * their own. The results show a skeleton while the next ones load.
 * Generic: its texts come from the caller.
 */
export function ListToolbar({ basePath, search, selects = [], toggles = [] }: ListToolbarProps) {
  const params = useSearchParams();
  const { pending, navigate: go } = useListNavigation();
  const [text, setText] = useState(params.get("q") ?? "");

  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const query = next.toString();
    go(query ? `${basePath}?${query}` : basePath);
  }

  // Typing restarts the delay; the search runs once the typing pauses.
  useEffect(() => {
    const q = text.trim();
    if (q === (params.get("q") ?? "")) return;
    const timeout = setTimeout(() => navigate({ q: q || null }), SEARCH_DELAY_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text starts a search
  }, [text]);

  const valueOf = ({ param, options }: Choice) => params.get(param) ?? options[0]?.value;
  const choose = ({ param, options }: Choice, value: string) =>
    navigate({ [param]: value === options[0]?.value ? null : value });

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-2 lg:flex-row lg:items-center">
      {search && (
        <div className="relative w-full lg:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={search.label}
            aria-label={search.label}
            className="pr-8 pl-8"
          />
          {pending && (
            <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        {!search && pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        {toggles.map((toggle) => (
          <div key={toggle.param} role="group" aria-label={toggle.label} className="flex gap-1 rounded-lg bg-muted p-1">
            {toggle.options.map((option) => {
              const active = valueOf(toggle) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choose(toggle, option.value)}
                  aria-pressed={active}
                  aria-label={option.icon ? option.label : undefined}
                  title={option.icon ? option.label : undefined}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
                    active && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {option.icon ?? option.label}
                </button>
              );
            })}
          </div>
        ))}
        {selects.map((select) => (
          <div key={select.param} className="relative">
            <select
              aria-label={select.label}
              value={valueOf(select)}
              onChange={(event) => choose(select, event.target.value)}
              className="h-8 appearance-none rounded-lg border border-input bg-transparent pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}
