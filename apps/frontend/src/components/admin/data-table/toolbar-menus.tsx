"use client";

import { ArrowDownIcon, ArrowDownUpIcon, ArrowUpIcon, BrushCleaningIcon, ChevronDownIcon, ListIcon, PlusCircleIcon, RowsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Tip } from "./tip";
import { viewIcon } from "./use-data-table";
import type { DataTableConfig, DataTableFacet } from "./types";
import type { DataTableState } from "./use-data-table";

interface MenuProps<T> {
  config: DataTableConfig<T>;
  state: DataTableState<T>;
}

/** In use, in blue: the fill alone, for buttons inside a group. */
const ACTIVE_FILL =
  "bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 hover:text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 dark:hover:text-blue-200 aria-expanded:bg-blue-500/15 aria-expanded:text-blue-700 dark:aria-expanded:text-blue-300";

/** Active filters, in blue. */
const ACTIVE =
  "border-solid border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 hover:text-blue-800 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 dark:hover:text-blue-200 aria-expanded:bg-blue-500/15 aria-expanded:text-blue-700 dark:aria-expanded:text-blue-300";

/** A button inside the group of tools: edge to edge, no border of its own. */
export const IN_GROUP = "h-full rounded-none border-0";

const BADGE = "rounded-sm bg-blue-500/15 px-1 font-normal text-inherit";

export function FacetFilter({
  facet,
  counts,
  value,
  picked,
  disabled,
  onChange,
}: {
  facet: DataTableFacet;
  /** Rows per option, from the server. */
  counts: Record<string, number>;
  value: string[];
  /** Chosen by the user: in blue with its values, else plain. */
  picked: boolean;
  /** While the server answers. */
  disabled: boolean;
  /** Null hands the filter back to the system. */
  onChange: (value: string[] | null) => void;
}) {
  const labels = facet.options.filter((option) => value.includes(option.value));
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger disabled={disabled} render={<Button variant="outline" size="sm" className={cn("rounded-lg", picked && ACTIVE)} />}>
        <PlusCircleIcon data-icon="inline-start" />
        {facet.label}
        {picked && (
          <span className="contents max-sm:hidden">
            {labels.length === 0 ? (
              <Badge variant="secondary" className={BADGE}>
                Tous
              </Badge>
            ) : labels.length > 2 ? (
              <Badge variant="secondary" className={BADGE}>
                {labels.length} sélectionnés
              </Badge>
            ) : (
              labels.map((option) => (
                <Badge key={option.value} variant="secondary" className={BADGE}>
                  {option.label}
                </Badge>
              ))
            )}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuGroup>
          {facet.options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={(on) => onChange(on ? [...value, option.value] : value.filter((each) => each !== option.value))}
            >
              {option.icon}
              {option.label}
              <span className="ml-auto pl-2 text-xs text-muted-foreground tabular-nums">{counts[option.value] ?? "–"}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <ResetItem disabled={!picked} onClick={() => onChange(null)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The current view, as a dark pill opening the others. */
export function ViewMenu<T>({ config, state }: MenuProps<T>) {
  const current = state.view;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        disabled={state.loading}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 text-[0.8rem] font-medium text-neutral-50 outline-none transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-neutral-800 [&_svg]:size-3.5"
        aria-label={`Vue : ${current?.label}`}
      >
        {current && viewIcon(current, config)}
        <span className="max-sm:hidden">{current?.label}</span>
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      {/* As wide as its longest name, on one line. */}
      <DropdownMenuContent align="center" className="w-auto min-w-44 whitespace-nowrap">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Vue</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={state.viewId} onValueChange={(value: string) => state.setView(value)}>
            {config.views?.map((each) => (
              <DropdownMenuRadioItem key={each.id} value={each.id} closeOnClick>
                {viewIcon(each, config)}
                {each.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Last item of a menu, back to its default; disabled while there. */
function ResetItem({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={disabled} onClick={onClick}>
        <BrushCleaningIcon className="text-red-500/70 dark:text-red-400/70" />
        Réinitialiser
      </DropdownMenuItem>
    </>
  );
}

/** An icon alone at rest; in use, in blue with what it does. */
function ToolTrigger({ active, disabled, label, icon, children }: { active: boolean; disabled: boolean; label: string; icon: ReactNode; children?: ReactNode }) {
  return (
    <Tip label={label}>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            variant="ghost"
            size={active ? "sm" : "icon-sm"}
            className={cn(IN_GROUP, active && cn(ACTIVE_FILL, "max-sm:w-7 max-sm:px-0 group-data-compact/toolbar:w-7 group-data-compact/toolbar:px-0"))}
            aria-label={label}
          />
        }
      >
        {icon}
        {/* The detail only where there is room for it, else the blue alone. */}
        {active && <span className="contents max-sm:hidden group-data-compact/toolbar:hidden">{children}</span>}
      </DropdownMenuTrigger>
    </Tip>
  );
}

export function SortMenu<T>({ config, state }: MenuProps<T>) {
  const { sort, setSort } = state;
  const sortable = config.columns.filter((column) => column.sortable);
  const current = sortable.find((column) => column.id === sort.id);
  const changed = state.picks.sort !== null;
  return (
    <DropdownMenu modal={false}>
      <ToolTrigger disabled={state.loading} active={changed} label="Trier" icon={<ArrowDownUpIcon />}>
        {current?.header}
        {sort.desc ? <ArrowDownIcon /> : <ArrowUpIcon />}
      </ToolTrigger>
      <DropdownMenuContent align="center" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Trier par</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort.id} onValueChange={(id: string) => setSort({ ...sort, id })}>
            {sortable.map((column) => (
              <DropdownMenuRadioItem key={column.id} value={column.id}>
                {column.header}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={sort.desc ? "desc" : "asc"} onValueChange={(value: string) => setSort({ ...sort, desc: value === "desc" })}>
            <DropdownMenuRadioItem value="asc">
              <ArrowUpIcon />
              Croissant
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">
              <ArrowDownIcon />
              Décroissant
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <ResetItem disabled={!changed} onClick={() => setSort(null)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GroupMenu<T>({ config, state }: MenuProps<T>) {
  const picked = state.picks.groupBy;
  const current = state.grouping;
  return (
    <DropdownMenu modal={false}>
      <ToolTrigger disabled={state.loading} active={picked !== undefined} label="Grouper" icon={<RowsIcon />}>
        {current?.label}
      </ToolTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Grouper par</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current?.id ?? ""} onValueChange={(value: string) => state.setGroupBy(value)}>
            {/* Without a default, the reset item ungroups. */}
            {config.defaultGroupBy && (
              <DropdownMenuRadioItem value="" closeOnClick>
                Aucun
              </DropdownMenuRadioItem>
            )}
            {config.groupings?.map((grouping) => (
              <DropdownMenuRadioItem key={grouping.id} value={grouping.id} closeOnClick>
                {grouping.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <ResetItem disabled={picked === undefined} onClick={() => state.setGroupBy(undefined)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ColumnsMenu<T>({ state }: MenuProps<T>) {
  const { hidden, shown, setHidden, setShown, view } = state;
  // Those of every view; a column of the view is hidden, one of another view shown.
  const inView = (id: string) => !view?.columns || view.columns.includes(id);
  const visible = new Set(state.columns.map((column) => column.id));
  const toggle = (id: string, on: boolean) => {
    if (inView(id)) setHidden(new Set(on ? [...hidden].filter((each) => each !== id) : [...hidden, id]));
    else setShown(new Set(on ? [...shown, id] : [...shown].filter((each) => each !== id)));
  };
  return (
    <DropdownMenu modal={false}>
      <ToolTrigger disabled={state.loading} active={state.picks.hidden !== null || state.picks.shown !== null} label="Colonnes" icon={<ListIcon />}>
        <span className="tabular-nums">
          {visible.size}/{state.available.length}
        </span>
      </ToolTrigger>
      <DropdownMenuContent align="center" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
          {state.available
            .filter((column) => !column.locked)
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={visible.has(column.id)}
                // The last column shown stays: a table of none would show nothing.
                disabled={visible.size === 1 && visible.has(column.id)}
                onCheckedChange={(on) => toggle(column.id, on)}
              >
                {column.header}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuGroup>
        <ResetItem
          disabled={state.picks.hidden === null && state.picks.shown === null}
          onClick={() => {
            setHidden(null);
            setShown(null);
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
