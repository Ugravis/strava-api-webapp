"use client";

import { ActivityIcon, GridIcon, HeartHandshakeIcon, type LucideIcon, RefreshCwIcon, UsersIcon } from "lucide-react";
import { ViewTabs, type ViewTabsProps } from "@/components/admin/site-activity/view-tabs";
import type { BusinessTab } from "./tabs";

const ICONS: Record<BusinessTab, LucideIcon> = {
  accounts: UsersIcon,
  sports: ActivityIcon,
  exploration: GridIcon,
  community: HeartHandshakeIcon,
  strava: RefreshCwIcon,
};

/** Parts of the business statistics. */
export function BusinessTabs(props: ViewTabsProps<BusinessTab>) {
  return <ViewTabs {...props} icons={ICONS} />;
}
