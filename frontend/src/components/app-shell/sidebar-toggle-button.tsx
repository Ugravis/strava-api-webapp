"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { SIDEBAR_ACTION_BUTTON, useSidebarActionTooltip } from "./sidebar-action";

/**
 * Collapses the sidebar to its icons or expands it again. Hidden on mobile,
 * where the sidebar is a drawer opened from the top bar.
 */
export function SidebarToggleButton() {
  const t = useTranslations("nav");
  const { open, toggleSidebar } = useSidebar();
  const label = open ? t("collapseMenu") : t("expandMenu");

  return (
    <SidebarMenuButton
      onClick={toggleSidebar}
      tooltip={useSidebarActionTooltip(label)}
      aria-label={label}
      aria-expanded={open}
      className={`${SIDEBAR_ACTION_BUTTON} hidden md:flex`}
    >
      {open ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
    </SidebarMenuButton>
  );
}
