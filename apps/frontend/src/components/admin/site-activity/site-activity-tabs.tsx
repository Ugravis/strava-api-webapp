"use client";

import { FileTextIcon, FilterIcon, type LucideIcon, RepeatIcon, RouteIcon, SlidersHorizontalIcon, UsersIcon } from "lucide-react";
import type { SiteActivityTab } from "./tabs";
import { ViewTabs, type ViewTabsProps } from "./view-tabs";

const ICONS: Record<SiteActivityTab, LucideIcon> = {
  audience: UsersIcon,
  retention: RepeatIcon,
  pages: FileTextIcon,
  sessions: RouteIcon,
  params: SlidersHorizontalIcon,
  funnel: FilterIcon,
};

/** Parts of the site activity. */
export function SiteActivityTabs(props: ViewTabsProps<SiteActivityTab>) {
  return <ViewTabs {...props} icons={ICONS} />;
}
