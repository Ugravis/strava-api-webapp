"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@kilotrace/ui/components/sidebar";
import type { QuickAccessProps } from "@/config/navigation";
import { routes } from "@/config/routes";
import { searchOfModule } from "./map-address";
import { MAP_MODULES } from "./map-layers";
import { MAP_MODULE_ICONS } from "./map-module-icons";
import { requestMapModule, useOpenMapModule } from "./map-module-channel";

/**
 * Quick access to the modules of the map, under its entry in the navigation,
 * aligned with the other entries. Away from the map, a module opens it on
 * that module; on the map, it is selected there, keeping the rest of the
 * map as it is.
 */
export function MapModulesNav({ onNavigate }: QuickAccessProps) {
  const t = useTranslations("map.modules");
  const current = useOpenMapModule();

  return (
    <SidebarMenu>
      {MAP_MODULES.map((module) => {
        const Icon = MAP_MODULE_ICONS[module];
        const label = t(module);
        const active = module === current;
        return (
          <SidebarMenuItem key={module}>
            <SidebarMenuButton
              isActive={active}
              tooltip={label}
              render={
                <Link
                  href={`${routes.map}${searchOfModule(module)}`}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => {
                    if (current !== null) {
                      event.preventDefault();
                      requestMapModule(module);
                    }
                    onNavigate();
                  }}
                />
              }
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
