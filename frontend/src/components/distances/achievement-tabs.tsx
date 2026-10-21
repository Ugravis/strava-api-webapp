"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACHIEVEMENT_TAB_ICONS,
  ACHIEVEMENT_TABS,
  achievementTabHref,
  type AchievementTab,
} from "@/config/achievement-tabs";

/** The sliding indicator is the active background: the tab itself stays transparent. */
const TRIGGER =
  "z-10 min-w-0 px-0.5 text-[13px] after:hidden hover:bg-background/60 hover:text-foreground data-active:bg-transparent data-active:shadow-none data-active:hover:bg-transparent sm:px-1.5 sm:text-sm dark:hover:bg-input/20 dark:data-active:border-transparent dark:data-active:bg-transparent";

/** First-level tabs of the achievements page, across the whole content; the tab is kept in the address. */
export function AchievementTabs({ value }: { value: AchievementTab }) {
  const t = useTranslations("distances.tabs");
  const router = useRouter();
  // Selected at once, so the indicator slides without waiting for the navigation; the address wins afterwards.
  const [selected, setSelected] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setSelected(value);
  }

  return (
    <Tabs
      value={selected}
      onValueChange={(next) => {
        setSelected(next as AchievementTab);
        router.push(achievementTabHref(next as AchievementTab), { scroll: false });
      }}
    >
      <TabsList aria-label={t("label")} className="relative w-full group-data-horizontal/tabs:h-10">
        <TabsPrimitive.Indicator className="absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-md border border-transparent bg-background shadow-sm transition-[left,width] duration-300 ease-out motion-reduce:transition-none dark:border-input dark:bg-input/30" />
        {ACHIEVEMENT_TABS.map((tab) => {
          const Icon = ACHIEVEMENT_TAB_ICONS[tab];
          return (
            <TabsTrigger key={tab} value={tab} className={TRIGGER}>
              <Icon aria-hidden className="hidden sm:block" />
              <span className="truncate">{t(tab)}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
