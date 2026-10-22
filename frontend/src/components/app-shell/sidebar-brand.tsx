"use client";

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppLogoMark } from "@/components/brand/app-logo";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import { siteConfig } from "@/config/site";

/**
 * Logo and name of the app, with the button collapsing the sidebar beside
 * them. Once collapsed, the logo expands it again, the icon of the panel
 * shown on hover. On mobile, the sidebar is a drawer: no collapse.
 */
export function SidebarBrand() {
  const t = useTranslations("nav");
  const { state, isMobile, toggleSidebar } = useSidebar();

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={toggleSidebar}
          tooltip={t("expandMenu")}
          aria-label={t("expandMenu")}
          className="group/brand"
        >
          <AppLogoMark className="group-hover/brand:hidden group-focus-visible/brand:hidden" />
          <PanelLeftOpenIcon className="mx-auto hidden size-4! group-hover/brand:block group-focus-visible/brand:block" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="flex items-center gap-1">
      <SidebarMenuButton size="lg" render={<Link href={DEFAULT_AUTHENTICATED_ROUTE} />} className="min-w-0 flex-1">
        <AppLogoMark />
        <span className="truncate font-semibold">{siteConfig.name}</span>
      </SidebarMenuButton>
      {!isMobile && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t("collapseMenu")}
                aria-expanded
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
              />
            }
          >
            <PanelLeftCloseIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="right">{t("collapseMenu")}</TooltipContent>
        </Tooltip>
      )}
    </SidebarMenuItem>
  );
}
