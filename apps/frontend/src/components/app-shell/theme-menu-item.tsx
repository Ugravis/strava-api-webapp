"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useThemeToggle } from "@/components/theme/use-theme-toggle";
import { DropdownMenuItem } from "@kilotrace/ui/components/dropdown-menu";

/** Light/dark switch in the account menu; labels and icons are swapped in CSS to stay hydration-safe. */
export function ThemeMenuItem() {
  const t = useTranslations("theme");
  const toggle = useThemeToggle();

  return (
    <DropdownMenuItem closeOnClick={false} onClick={toggle}>
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
      <span className="dark:hidden">{t("switchToDark")}</span>
      <span className="hidden dark:inline">{t("switchToLight")}</span>
    </DropdownMenuItem>
  );
}
