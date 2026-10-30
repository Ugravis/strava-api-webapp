"use client";

import {
  ArrowDownIcon,
  ArrowDownUpIcon,
  ArrowUpIcon,
  BanIcon,
  BrushCleaningIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  EyeOffIcon,
  ListIcon,
  PinIcon,
  PinOffIcon,
  PlusCircleIcon,
  PlusIcon,
  RowsIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
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
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Picks, PocColumn, PocFacet, PocTableConfig, Sort } from "./poc-table";

interface PocToolbarProps<T> {
  config: PocTableConfig<T>;
  query: string;
  onQuery: (value: string) => void;
  filters: Record<string, string[]>;
  onFilters: (value: Record<string, string[]>) => void;
  onReset: () => void;
  filtered: boolean;
  sort: Sort;
  groupBy: string | null;
  hidden: Set<string>;
  view: string;
  onView: (value: string) => void;
  /** No columns to pick on cards. */
  cards: boolean;
  /** The first column kept on screen while scrolling sideways. */
  pinned: boolean;
  onPinned: (value: boolean) => void;
  /** What the user chose, active in blue; the rest is the system's. */
  picks: Picks;
  onSort: (value: Sort | null) => void;
  onGroupBy: (value: string | null | undefined) => void;
  onHidden: (value: Set<string> | null) => void;
}

/** In use, in blue: the fill alone, for buttons inside a group. */
const ACTIVE_FILL =
  "bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 hover:text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 dark:hover:text-blue-200 aria-expanded:bg-blue-500/15 aria-expanded:text-blue-700 dark:aria-expanded:text-blue-300";

/** Active filters, in blue. */
const ACTIVE =
  "border-solid border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 hover:text-blue-800 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25 dark:hover:text-blue-200 aria-expanded:bg-blue-500/15 aria-expanded:text-blue-700 dark:aria-expanded:text-blue-300";

/** A button inside the group: edge to edge, no border of its own. */
const IN_GROUP = "h-full rounded-none border-0";

/** Its name in a bubble, after a short pause on it. */
function Tip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger delay={400} render={children} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Search and filters on the left, the shape of the table on the right. */
export function PocToolbar<T>(props: PocToolbarProps<T>) {
  const { config, query, onQuery, filters, onFilters, onReset, filtered } = props;
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {config.views && <ViewMenu {...props} />}
          <InputGroup className="h-7 w-full bg-background sm:w-64 [&_svg]:size-3.5">
          <InputGroupAddon className="text-foreground">
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput className="text-[0.8rem]" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={config.search.label} aria-label={config.search.label} />
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={() => onQuery("")} aria-label="Effacer la recherche">
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
          </InputGroup>
        {config.facets && <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />}
        {config.facets?.map((facet) => (
          <FacetFilter
            key={facet.id}
            facet={facet}
            rows={config.rows}
            value={filters[facet.id] ?? []}
            picked={facet.id in props.picks.filters}
            onChange={(value) => {
              const { [facet.id]: _, ...rest } = props.picks.filters;
              onFilters(value ? { ...rest, [facet.id]: value } : rest);
            }}
          />
        ))}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div role="group" aria-label="Affichage" className="flex h-7 divide-x overflow-hidden rounded-lg border bg-background">
          {filtered && (
            <Tip label="Tout réinitialiser">
              <Button variant="ghost" size="icon-sm" onClick={onReset} aria-label="Tout réinitialiser" className={cn(IN_GROUP, "text-red-600/80 hover:text-red-600 dark:text-red-400/80 dark:hover:text-red-400")}>
                <BrushCleaningIcon />
              </Button>
            </Tip>
          )}
          <SortMenu {...props} />
          {config.groupings && !props.cards && <GroupMenu {...props} />}
          {!props.cards && <ColumnsMenu {...props} />}
          {!props.cards && (
            <Tip label="Figer la première colonne">
              <Button
                variant="ghost"
                size="icon-sm"
                className={IN_GROUP}
                onClick={() => props.onPinned(!props.pinned)}
                aria-pressed={props.pinned}
                aria-label="Figer la première colonne"
              >
                {props.pinned ? <PinIcon /> : <PinOffIcon />}
              </Button>
            </Tip>
          )}
        </div>
        {config.create && (
          <Button size="sm" onClick={config.create.onClick} className="rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500">
            <PlusIcon data-icon="inline-start" />
            {config.create.label}
          </Button>
        )}
      </div>
    </div>
  );
}

function FacetFilter<T>({
  facet,
  rows,
  value,
  picked,
  onChange,
}: {
  facet: PocFacet<T>;
  rows: T[];
  value: string[];
  /** Chosen by the user: in blue with its values, else plain. */
  picked: boolean;
  /** Null hands the filter back to the system. */
  onChange: (value: string[] | null) => void;
}) {
  const labels = facet.options.filter((option) => value.includes(option.value));
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className={cn("rounded-lg", picked && ACTIVE)} />}>
        <PlusCircleIcon data-icon="inline-start" />
        {facet.label}
        {picked && (
          <>
            {labels.length === 0 ? (
              <Badge variant="secondary" className="rounded-sm bg-blue-500/15 px-1 font-normal text-inherit">
                Tous
              </Badge>
            ) : labels.length > 2 ? (
              <Badge variant="secondary" className="rounded-sm bg-blue-500/15 px-1 font-normal text-inherit">
                {labels.length} sélectionnés
              </Badge>
            ) : (
              labels.map((option) => (
                <Badge key={option.value} variant="secondary" className="rounded-sm bg-blue-500/15 px-1 font-normal text-inherit">
                  {option.label}
                </Badge>
              ))
            )}
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuGroup>
          {facet.options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              closeOnClick
              checked={value.includes(option.value)}
              onCheckedChange={(on) => onChange(on ? [...value, option.value] : value.filter((each) => each !== option.value))}
            >
              {option.icon}
              {option.label}
              <span className="ml-auto pl-2 text-xs text-muted-foreground tabular-nums">
                {rows.filter((row) => facet.values(row).includes(option.value)).length}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        <ResetItem disabled={!picked} onClick={() => onChange(null)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The current view, as a dark pill opening the others. */
function ViewMenu<T>({ config, view, onView }: PocToolbarProps<T>) {
  const current = config.views?.find((each) => each.id === view);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-2.5 text-[0.8rem] font-medium text-neutral-50 outline-none dark:bg-neutral-800 transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5"
        aria-label={`Vue : ${current?.label}`}
      >
        {current?.icon}
        {current?.label}
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Vue</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={view} onValueChange={(value: string) => onView(value)}>
            {config.views?.map((each) => (
              <DropdownMenuRadioItem key={each.id} value={each.id} closeOnClick>
                {each.icon}
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
function ToolTrigger({ active, label, icon, children }: { active: boolean; label: string; icon: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Tip label={label}>
      <DropdownMenuTrigger render={<Button variant="ghost" size={active ? "sm" : "icon-sm"} className={cn(IN_GROUP, active && ACTIVE_FILL)} aria-label={label} />}>
        {icon}
        {active && children}
      </DropdownMenuTrigger>
    </Tip>
  );
}

function SortMenu<T>({ config, sort, onSort, picks }: PocToolbarProps<T>) {
  const sortable = config.columns.filter((column) => column.sortValue);
  const current = sortable.find((column) => column.id === sort.id);
  const changed = picks.sort !== null;
  return (
    <DropdownMenu modal={false}>
      <ToolTrigger active={changed} label="Trier" icon={<ArrowDownUpIcon />}>
        {current?.header}
        {sort.desc ? <ArrowDownIcon /> : <ArrowUpIcon />}
      </ToolTrigger>
      <DropdownMenuContent align="center" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Trier par</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort.id} onValueChange={(id: string) => onSort({ ...sort, id })}>
            {sortable.map((column) => (
              <DropdownMenuRadioItem key={column.id} value={column.id}>
                {column.header}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={sort.desc ? "desc" : "asc"} onValueChange={(value: string) => onSort({ ...sort, desc: value === "desc" })}>
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
        <ResetItem disabled={!changed} onClick={() => onSort(null)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupMenu<T>({ config, groupBy, onGroupBy, picks }: PocToolbarProps<T>) {
  const current = config.groupings?.find((grouping) => grouping.id === groupBy);
  return (
    <DropdownMenu modal={false}>
      <ToolTrigger active={picks.groupBy !== undefined} label="Grouper" icon={<RowsIcon />}>
        {current?.label ?? "Aucun"}
      </ToolTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Grouper par</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={groupBy ?? ""} onValueChange={(value: string) => onGroupBy(value || null)}>
            <DropdownMenuRadioItem value="" closeOnClick>
              Aucun
            </DropdownMenuRadioItem>
            {config.groupings?.map((grouping) => (
              <DropdownMenuRadioItem key={grouping.id} value={grouping.id} closeOnClick>
                {grouping.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <ResetItem disabled={picks.groupBy === undefined} onClick={() => onGroupBy(undefined)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColumnsMenu<T>({ config, hidden, onHidden, picks }: PocToolbarProps<T>) {
  return (
    <DropdownMenu modal={false}>
      <ToolTrigger active={picks.hidden !== null} label="Colonnes" icon={<ListIcon />}>
        <span className="tabular-nums">
          {config.columns.length - hidden.size}/{config.columns.length}
        </span>
      </ToolTrigger>
      <DropdownMenuContent align="center" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
          {config.columns
            .filter((column) => !column.locked)
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={!hidden.has(column.id)}
                onCheckedChange={(on) => onHidden(new Set(on ? [...hidden].filter((id) => id !== column.id) : [...hidden, column.id]))}
              >
                {column.header}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuGroup>
        <ResetItem disabled={picks.hidden === null} onClick={() => onHidden(null)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A header opening its menu: sort either way, or hide the column. */
export function ColumnHeader<T>({ column, sort, onSort, onHide }: { column: PocColumn<T>; sort: Sort; onSort: (value: Sort) => void; onHide?: () => void }) {
  if (!column.sortValue && !onHide) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-muted-foreground/70 [&_svg]:size-3.5">{column.icon}</span>
        {column.header}
      </span>
    );
  }
  const active = sort.id === column.id;
  const Icon = !active ? ChevronsUpDownIcon : sort.desc ? ArrowDownIcon : ArrowUpIcon;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          "group/header -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:text-foreground",
          active && "text-foreground",
        )}
      >
        <span className="text-muted-foreground/70 transition-colors group-hover/header:text-foreground group-data-popup-open/header:text-foreground [&_svg]:size-3.5">{column.icon}</span>
        {column.header}
        {column.sortValue && <Icon className={cn("size-3.5", !active && "opacity-40")} aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        {column.sortValue && (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onSort({ id: column.id, desc: false })}>
              <ArrowUpIcon />
              Croissant
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort({ id: column.id, desc: true })}>
              <ArrowDownIcon />
              Décroissant
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
        {column.sortValue && onHide && <DropdownMenuSeparator />}
        {onHide && (
          <DropdownMenuItem onClick={onHide}>
            <EyeOffIcon />
            Masquer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Floats at the bottom of the screen while rows are selected. */
export function SelectionBar({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div role="toolbar" aria-label="Sélection" className="flex items-center gap-1 rounded-xl border bg-popover p-1.5 pl-3 text-sm shadow-lg">
        <span className="font-medium tabular-nums">{count} sélectionné{count > 1 ? "s" : ""}</span>
        <Separator orientation="vertical" className="mx-1.5 h-5" />
        <Button size="sm" variant="ghost">
          <DownloadIcon data-icon="inline-start" />
          Exporter
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
          <BanIcon data-icon="inline-start" />
          Suspendre
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onClear} aria-label="Tout désélectionner">
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
