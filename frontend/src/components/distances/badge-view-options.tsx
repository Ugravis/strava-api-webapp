"use client";

import { ArrowDownUpIcon, LayoutGridIcon, Rows3Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BADGE_SORTS, type BadgeSort } from "@/lib/badge-sort";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "badges-compact-view";

const viewListeners = new Set<() => void>();
/** The view picked during the visit, kept when the browser blocks the storage. */
let pickedCompact: boolean | null = null;

function subscribeView(onChange: () => void) {
  viewListeners.add(onChange);
  return () => viewListeners.delete(onChange);
}

function compactSnapshot(): boolean {
  if (pickedCompact !== null) return pickedCompact;
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function changeCompact(compact: boolean) {
  pickedCompact = compact;
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, compact ? "1" : "0");
  } catch {
    // Storage blocked: the view lasts until the page is reloaded.
  }
  viewListeners.forEach((listener) => listener());
}

/** Whether the badges are shown compact, the default, kept by the browser when it can. */
export function useCompactView(): [boolean, (compact: boolean) => void] {
  return [useSyncExternalStore(subscribeView, compactSnapshot, () => true), changeCompact];
}

/** The two views, side by side in the switch. */
const VIEWS = [
  { compact: false, icon: Rows3Icon, label: "normalView" },
  { compact: true, icon: LayoutGridIcon, label: "compactView" },
] as const;

interface BadgeViewOptionsProps {
  sort: BadgeSort;
  onSortChange: (sort: BadgeSort) => void;
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
}

/** Order of the badges of the sections, and the switch between the normal and the compact view. */
export function BadgeViewOptions({ sort, onSortChange, compact, onCompactChange }: BadgeViewOptionsProps) {
  const t = useTranslations("distances.viewOptions");

  return (
    <div className="flex shrink-0 gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-lg" className="gap-1.5 bg-card sm:w-auto sm:px-3" aria-label={t("sortLabel")} />}
        >
          <ArrowDownUpIcon />
          <span className="hidden sm:inline">{t(`sorts.${sort}`)}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("sortLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as BadgeSort)}>
              {BADGE_SORTS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option} closeOnClick>
                  {t(`sorts.${option}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <div role="group" aria-label={t("viewLabel")} className="flex h-9 rounded-lg bg-muted p-0.5">
        {VIEWS.map(({ compact: value, icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => onCompactChange(value)}
            aria-pressed={compact === value}
            aria-label={t(label)}
            title={t(label)}
            className={cn(
              "grid w-8 place-items-center rounded-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
              compact === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon />
          </button>
        ))}
      </div>
    </div>
  );
}
