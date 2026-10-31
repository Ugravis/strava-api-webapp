"use client";

import { BrushCleaningIcon, PinIcon, PinOffIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { Tip } from "./tip";
import { ColumnsMenu, FacetFilter, GroupMenu, IN_GROUP, SortMenu, ViewMenu } from "./toolbar-menus";
import type { DataTableConfig } from "./types";
import type { DataTableState } from "./use-data-table";
import { PHONE } from "./use-table-params";

const CREATE = "rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500";

/**
 * Search and filters on the left, the shape of the table on the right. On
 * a phone, two lines: the view, the search and the main action, then the
 * filters and the tools, sliding sideways.
 */
export function DataTableToolbar<T>({ config, state }: { config: DataTableConfig<T>; state: DataTableState<T> }) {
  const root = useRef<HTMLDivElement>(null);
  // On a wide screen, the details of the tools go only when they would push
  // the header onto a second line. Set on the box, measured before paint.
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const fit = () => {
      // Without transitions while measuring: a padding on its way would lie.
      element.setAttribute("data-measuring", "");
      element.removeAttribute("data-compact");
      if (!window.matchMedia(PHONE).matches && element.offsetHeight > 48) element.setAttribute("data-compact", "");
      // The final layout settled before transitions come back, so nothing animates.
      void element.offsetHeight;
      element.removeAttribute("data-measuring");
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(element);
    const mutation = new MutationObserver(fit);
    mutation.observe(element, { childList: true, subtree: true, characterData: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);
  const table = state.layout === "table";
  return (
    <div ref={root} className="group/toolbar flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center data-measuring:**:transition-none">
      <div className="flex min-w-0 items-center gap-2 sm:contents">
        {config.views && <ViewMenu config={config} state={state} />}
        {config.search && (
          <InputGroup className="h-7 min-w-0 flex-1 bg-background sm:w-64 sm:flex-none [&_svg]:size-3.5">
            <InputGroupAddon className="text-foreground">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              className="text-[0.8rem]"
              value={state.query}
              onChange={(event) => state.setQuery(event.target.value)}
              placeholder={config.search}
              aria-label={config.search}
            />
            {state.query && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" onClick={() => state.setQuery("")} aria-label="Effacer la recherche">
                  <XIcon />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        )}
        {config.create && (
          <Button size="icon-sm" onClick={config.create.onClick} aria-label={config.create.label} className={cn(CREATE, "ml-auto sm:hidden")}>
            <PlusIcon />
          </Button>
        )}
      </div>
      <div className="-m-1 flex items-center gap-2 overflow-x-auto p-1 [scrollbar-width:none] sm:contents">
        {config.facets && (config.views || config.search) && <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />}
        {config.facets?.map((facet) => (
          <FacetFilter
            key={facet.id}
            facet={facet}
            counts={state.last?.counts[facet.id] ?? {}}
            value={state.filters[facet.id] ?? []}
            picked={facet.id in state.picks.filters}
            disabled={state.loading}
            onChange={(value) => {
              const { [facet.id]: _, ...rest } = state.picks.filters;
              state.setFilters(value ? { ...rest, [facet.id]: value } : rest);
            }}
          />
        ))}
        <div role="group" aria-label="Affichage" className="ml-auto flex h-7 shrink-0 divide-x overflow-hidden rounded-lg border bg-background">
          {state.changed && (
            <Tip label="Tout réinitialiser">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={state.loading}
                onClick={state.resetAll}
                aria-label="Tout réinitialiser"
                className={cn(IN_GROUP, "text-red-600/80 hover:text-red-600 dark:text-red-400/80 dark:hover:text-red-400")}
              >
                <BrushCleaningIcon />
              </Button>
            </Tip>
          )}
          {config.columns.some((column) => column.sortable) && <SortMenu config={config} state={state} />}
          {config.groupings && <GroupMenu config={config} state={state} />}
          <ColumnsMenu config={config} state={state} />
          {table && (
            <Tip label="Figer la première colonne">
              {/* Never pinned on a phone: too narrow. */}
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(IN_GROUP, "max-sm:hidden")}
                disabled={state.loading}
                onClick={() => state.setPinned(!state.pinned)}
                aria-pressed={state.pinned}
                aria-label="Figer la première colonne"
              >
                {state.pinned ? <PinIcon /> : <PinOffIcon />}
              </Button>
            </Tip>
          )}
        </div>
        {config.create && (
          <Button size="sm" onClick={config.create.onClick} className={cn(CREATE, "max-sm:hidden")}>
            <PlusIcon data-icon="inline-start" />
            {config.create.label}
          </Button>
        )}
      </div>
    </div>
  );
}
