"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@kilotrace/ui/components/button";
import { useThemeToggle } from "./use-theme-toggle";

/** Icon button; icons are switched in CSS to avoid any hydration mismatch. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const toggle = useThemeToggle();

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("toggle")}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}
