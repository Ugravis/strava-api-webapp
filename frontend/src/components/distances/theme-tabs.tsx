"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BadgeTheme } from "@/lib/api/types";

/** Value of the tab showing every badge. */
export const ALL_THEMES = "all";

interface ThemeTabsProps {
  themes: BadgeTheme[];
  /** A theme, or `ALL_THEMES`. */
  value: string;
  onValueChange: (value: string) => void;
}

const PILL =
  "h-8 flex-none rounded-full border border-border bg-card px-3.5 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground dark:data-active:bg-primary dark:data-active:text-primary-foreground";

/** Pills narrowing the badges to a theme; scrolled sideways on narrow screens. */
export function ThemeTabs({ themes, value, onValueChange }: ThemeTabsProps) {
  const t = useTranslations("distances.themes");

  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(String(next))}>
      <div className="no-scrollbar -mx-1 overflow-x-auto px-1 py-0.5">
        <TabsList aria-label={t("label")} className="h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value={ALL_THEMES} className={PILL}>
            {t("all")}
          </TabsTrigger>
          {themes.map((theme) => (
            <TabsTrigger key={theme.id} value={theme.id} className={PILL}>
              {theme.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
