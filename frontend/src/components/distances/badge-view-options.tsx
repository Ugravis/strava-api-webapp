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
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "1";
  } catch {
    return false;
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

/** Whether the badges are shown compact, kept by the browser when it can; the normal view on the server. */
export function useCompactView(): [boolean, (compact: boolean) => void] {
  return [useSyncExternalStore(subscribeView, compactSnapshot, () => false), changeCompact];
}

interface BadgeViewOptionsProps {
  sort: BadgeSort;
  onSortChange: (sort: BadgeSort) => void;
  compact: boolean;
  onCompactChange: (compact: boolean) => void;
}

/** Order of the badges of the sections, and the switch between the normal and the compact view. */
export function BadgeViewOptions({ sort, onSortChange, compact, onCompactChange }: BadgeViewOptionsProps) {
  const t = useTranslations("distances.viewOptions");
  const ViewIcon = compact ? Rows3Icon : LayoutGridIcon;

  return (
    <div className="flex shrink-0 gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-lg" className="bg-card sm:w-auto sm:px-3" aria-label={t("sortLabel")} />}
        >
          <ArrowDownUpIcon />
          <span className="hidden sm:inline">{t(`sorts.${sort}`)}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("sortLabel")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as BadgeSort)}>
              {BADGE_SORTS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {t(`sorts.${option}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="icon-lg"
        className="bg-card"
        onClick={() => onCompactChange(!compact)}
        aria-pressed={compact}
        aria-label={t("compact")}
        title={compact ? t("normalView") : t("compactView")}
      >
        <ViewIcon />
      </Button>
    </div>
  );
}
