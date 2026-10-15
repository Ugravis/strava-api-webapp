"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useThemeToggle } from "@/components/theme/use-theme-toggle";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

/** Light/dark switch; labels and icons are swapped in CSS to stay hydration-safe. */
export function ThemeMenuItem() {
  const t = useTranslations("theme");
  const toggle = useThemeToggle();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={toggle} tooltip={t("toggle")}>
        <MoonIcon className="dark:hidden" />
        <SunIcon className="hidden dark:block" />
        <span className="dark:hidden">{t("switchToDark")}</span>
        <span className="hidden dark:inline">{t("switchToLight")}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
