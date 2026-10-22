"use client";

import { SidebarNotificationsButton } from "@/components/notifications/notifications-bell";
import { SidebarMenuItem } from "@/components/ui/sidebar";
import { SidebarToggleButton } from "./sidebar-toggle-button";
import { SoundButton } from "./sound-button";

/** Collapse, sound and notifications, side by side; stacked once the sidebar is collapsed to its icons. */
export function SidebarActions() {
  return (
    <SidebarMenuItem className="flex gap-1 group-data-[collapsible=icon]:flex-col">
      <SidebarToggleButton />
      <SoundButton />
      <SidebarNotificationsButton />
    </SidebarMenuItem>
  );
}
