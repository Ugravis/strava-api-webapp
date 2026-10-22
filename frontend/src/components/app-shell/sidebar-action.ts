"use client";

import { useSidebar } from "@/components/ui/sidebar";

/** An icon button of the row of actions of the sidebar, sharing its width with the others. */
export const SIDEBAR_ACTION_BUTTON = "relative flex-1 justify-center";

/** Tooltip of an icon button of the row: shown whether the sidebar is collapsed or not, never on mobile. */
export function useSidebarActionTooltip(label: string) {
  const { isMobile, state } = useSidebar();
  return { children: label, hidden: isMobile, side: state === "collapsed" ? ("right" as const) : ("top" as const) };
}
