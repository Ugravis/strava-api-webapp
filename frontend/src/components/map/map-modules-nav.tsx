"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { routes } from "@/config/routes";
import type { QuickAccessProps } from "@/config/navigation";
import { moduleFromSearch, searchOfModule } from "./map-address";
import { MAP_MODULES } from "./map-layers";
import { MAP_MODULE_ICONS } from "./map-module-icons";
import { requestMapModule } from "./map-module-requests";

/**
 * Quick access to the modules of the map, under its entry in the navigation.
 * Away from the map, a module opens it on that module; on the map, it is
 * selected there, keeping the rest of the map as it is. With the sidebar
 * folded to its icons, the modules are smaller icons under the map's.
 */
export function MapModulesNav({ onNavigate }: QuickAccessProps) {
  const t = useTranslations("map.modules");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onMap = pathname === routes.map;
  const current = onMap ? moduleFromSearch(searchParams.toString()) : null;

  return (
    <SidebarMenuSub className="group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:px-0">
      {MAP_MODULES.map((module) => {
        const Icon = MAP_MODULE_ICONS[module];
        const active = module === current;
        return (
          <SidebarMenuSubItem key={module}>
            <SidebarMenuSubButton
              isActive={active}
              title={t(module)}
              className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:size-7 group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>span:last-child]:sr-only group-data-[collapsible=icon]:[&>svg]:size-3.5"
              render={
                <Link
                  href={`${routes.map}${searchOfModule(module)}`}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => {
                    if (onMap) {
                      event.preventDefault();
                      requestMapModule(module);
                    }
                    onNavigate();
                  }}
                />
              }
            >
              <Icon aria-hidden />
              <span>{t(module)}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}
