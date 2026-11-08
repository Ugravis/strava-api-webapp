"use client";

import { FileTextIcon, FilterIcon, type LucideIcon, RepeatIcon, RouteIcon, SlidersHorizontalIcon, UsersIcon } from "lucide-react";
import { UnderlineTabs, type UnderlineTabsProps } from "@/components/ui/underline-tabs";
import type { SiteActivityTab } from "./tabs";

const ICONS: Record<SiteActivityTab, LucideIcon> = {
  audience: UsersIcon,
  retention: RepeatIcon,
  pages: FileTextIcon,
  sessions: RouteIcon,
  params: SlidersHorizontalIcon,
  funnel: FilterIcon,
};

/** Parts of the site activity. */
export function SiteActivityTabs(props: UnderlineTabsProps<SiteActivityTab>) {
  return <UnderlineTabs {...props} icons={ICONS} accent="blue" />;
}
