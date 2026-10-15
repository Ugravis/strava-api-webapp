"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppLogo } from "@/components/brand/app-logo";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";

/** Top bar: menu button everywhere, logo on mobile where the sidebar is a drawer. */
export function AppHeader() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:h-12">
      <SidebarTrigger className="-ml-1" aria-label={t("openMenu")} />
      <Separator orientation="vertical" className="h-4 md:hidden" />
      <Link href={DEFAULT_AUTHENTICATED_ROUTE} className="min-w-0 md:hidden">
        <AppLogo />
      </Link>
    </header>
  );
}
