"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

/**
 * Collapses the sidebar to its icons or expands it again. Hidden on mobile,
 * where the sidebar is a drawer opened from the top bar.
 */
export function SidebarToggleMenuItem() {
  const t = useTranslations("nav");
  const { open, toggleSidebar } = useSidebar();
  const label = open ? t("collapseMenu") : t("expandMenu");

  return (
    <SidebarMenuItem className="hidden md:block">
      <SidebarMenuButton onClick={toggleSidebar} tooltip={label} aria-expanded={open}>
        {open ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
