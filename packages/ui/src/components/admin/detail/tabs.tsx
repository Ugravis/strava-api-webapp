"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kilotrace/ui/components/ui/tabs";

export interface DetailTab {
  id: string;
  label: string;
  icon?: ReactNode;
  /** After its label, e.g. the number of related rows. */
  count?: number;
  /** Its sections. */
  content: ReactNode;
}

/**
 * The parts of a long detail, one shown at a time: under the header (and
 * its buttons), a line of tabs scrolled sideways on a phone, the sections of
 * the tab picked under it. The first one at first, or `defaultTab`; only the
 * tab shown is drawn, so that a tab loading its rows loads them once opened.
 */
export function DetailTabs({ tabs, defaultTab }: { tabs: DetailTab[]; defaultTab?: string }) {
  return (
    <Tabs defaultValue={defaultTab ?? tabs[0]?.id} className="gap-0">
      <TabsList variant="line" className="h-10! w-full justify-start gap-1 overflow-x-auto overflow-y-hidden border-b px-3 [scrollbar-width:none]">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex-none px-2">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{tab.count.toLocaleString("fr-FR")}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="flex flex-col">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
