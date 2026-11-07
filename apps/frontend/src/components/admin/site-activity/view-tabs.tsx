"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** The sliding indicator is the active background: the tab itself stays transparent. */
const TRIGGER =
  "z-10 min-w-fit px-2 text-[13px] after:hidden data-active:bg-transparent data-active:shadow-none sm:px-1.5 sm:text-sm dark:data-active:border-transparent dark:data-active:bg-transparent";

export interface ViewTabsProps<Tab extends string> {
  value: Tab;
  tabs: { id: Tab; label: string; href: string }[];
  label: string;
}

/** Parts of a statistics page, as the tabs of the achievements; the tab is kept in the address. */
export function ViewTabs<Tab extends string>({ value, tabs, label, icons }: ViewTabsProps<Tab> & { icons: Record<Tab, LucideIcon> }) {
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
        const tab = tabs.find((entry) => entry.id === next);
        if (!tab) return;
        setSelected(tab.id);
        router.push(tab.href, { scroll: false });
      }}
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList aria-label={label} className="relative w-full min-w-max group-data-horizontal/tabs:h-10">
          <TabsPrimitive.Indicator className="absolute top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) rounded-md border border-transparent bg-background shadow-sm transition-[left,width] duration-300 ease-out motion-reduce:transition-none dark:border-input dark:bg-input/30" />
          {tabs.map((tab) => {
            const Icon: LucideIcon = icons[tab.id];
            return (
              <TabsTrigger key={tab.id} value={tab.id} className={TRIGGER}>
                <Icon aria-hidden className="hidden sm:block" />
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}
