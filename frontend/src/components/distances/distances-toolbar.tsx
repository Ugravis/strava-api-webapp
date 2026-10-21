"use client";

import { ArrowDownUpIcon, LayoutGridIcon, LayoutListIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DistancesOverview } from "@/lib/api/types";
import { BadgeSearch } from "./badge-search";
import { BADGE_SORTS, BADGE_VIEWS, type BadgeSort, type BadgeView, setBadgeView, useBadgeView } from "./badge-view";
import { ThemeTabs } from "./theme-tabs";

const VIEW_ICONS: Record<BadgeView, LucideIcon> = { cards: LayoutListIcon, compact: LayoutGridIcon };

interface DistancesToolbarProps {
  overview: DistancesOverview;
  onPick: (badgeId: string) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  sort: BadgeSort;
  onSortChange: (sort: BadgeSort) => void;
}

/** Between the top of the page and the badges: search, order, layout and themes. */
export function DistancesToolbar({ overview, onPick, theme, onThemeChange, sort, onSortChange }: DistancesToolbarProps) {
  const t = useTranslations("distances.toolbar");
  const view = useBadgeView();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <BadgeSearch badges={overview.badges} onPick={onPick} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="lg" className="bg-card" aria-label={t("sort.label")} title={t("sort.label")} />}
          >
            <ArrowDownUpIcon data-icon="inline-start" />
            <span className="hidden sm:inline">{t(`sort.${sort}`)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("sort.label")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => {
                  const next = BADGE_SORTS.find((candidate) => candidate === value);
                  if (next) onSortChange(next);
                }}
              >
                {BADGE_SORTS.map((value) => (
                  <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                    {t(`sort.${value}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToggleGroup
          aria-label={t("view.label")}
          variant="outline"
          size="lg"
          spacing={0}
          className="bg-card"
          value={[view]}
          onValueChange={([pressed]) => {
            // The pressed view stays pressed: one of them is always shown.
            const next = BADGE_VIEWS.find((value) => value === pressed);
            if (next) setBadgeView(next);
          }}
        >
          {BADGE_VIEWS.map((value) => {
            const Icon = VIEW_ICONS[value];
            return (
              <ToggleGroupItem key={value} value={value} aria-label={t(`view.${value}`)} title={t(`view.${value}`)}>
                <Icon />
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>
      {overview.themes.length > 0 && <ThemeTabs themes={overview.themes} value={theme} onValueChange={onThemeChange} />}
    </div>
  );
}
