"use client";

import { ActivityIcon, GridIcon, HeartHandshakeIcon, type LucideIcon, RefreshCwIcon, UsersIcon } from "lucide-react";
import { UnderlineTabs, type UnderlineTabsProps } from "@kilotrace/ui/components/ui/underline-tabs";
import type { BusinessTab } from "./tabs";

const ICONS: Record<BusinessTab, LucideIcon> = {
  accounts: UsersIcon,
  sports: ActivityIcon,
  exploration: GridIcon,
  community: HeartHandshakeIcon,
  strava: RefreshCwIcon,
};

/** Parts of the business statistics. */
export function BusinessTabs(props: UnderlineTabsProps<BusinessTab>) {
  return <UnderlineTabs {...props} icons={ICONS} accent="blue" />;
}
