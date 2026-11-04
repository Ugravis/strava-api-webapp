"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface UnderlineTab<Tab extends string> {
  id: Tab;
  label: string;
  /** The address of the tab, when it is kept there. */
  href?: string;
  /** Greyed while not selected. */
  dimmed?: boolean;
}

export interface UnderlineTabsProps<Tab extends string> {
  value: Tab;
  tabs: UnderlineTab<Tab>[];
  label: string;
  /** Called for the tabs without an address. */
  onValueChange?: (value: Tab) => void;
}

/** A line of tabs with a sliding underline, scrolled sideways when it does not fit. */
export function UnderlineTabs<Tab extends string>({
  value,
  tabs,
  label,
  onValueChange,
  icons,
}: UnderlineTabsProps<Tab> & { icons?: Record<Tab, LucideIcon> }) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement>(null);
  // Selected at once, so the underline slides without waiting for the navigation; `value` wins afterwards.
  const [selected, setSelected] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setSelected(value);
  }

  useEffect(() => {
    const line = scroller.current;
    const active = line?.querySelector<HTMLElement>("[data-active]");
    if (line && active) line.scrollTo({ left: active.offsetLeft - (line.clientWidth - active.offsetWidth) / 2 });
  }, [selected]);

  return (
    <Tabs
      value={selected}
      onValueChange={(next) => {
        const tab = tabs.find((entry) => entry.id === next);
        if (!tab) return;
        setSelected(tab.id);
        if (tab.href) router.push(tab.href, { scroll: false });
        else onValueChange?.(tab.id);
      }}
    >
      <div ref={scroller} className="overflow-x-auto [scrollbar-width:none]">
        <TabsList variant="line" aria-label={label} className="relative w-full min-w-max justify-start border-b p-0 group-data-horizontal/tabs:h-10">
          <TabsPrimitive.Indicator className="absolute -bottom-px left-(--active-tab-left) h-0.5 w-(--active-tab-width) bg-foreground transition-[left,width] duration-300 ease-out motion-reduce:transition-none" />
          {tabs.map((tab) => {
            const Icon: LucideIcon | undefined = icons?.[tab.id];
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "h-full flex-1 rounded-none px-2.5 text-[13px] after:hidden focus-visible:ring-inset sm:text-sm",
                  tab.dimmed && "not-data-active:opacity-60",
                )}
              >
                {Icon && <Icon aria-hidden className="hidden sm:block" />}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </Tabs>
  );
}
