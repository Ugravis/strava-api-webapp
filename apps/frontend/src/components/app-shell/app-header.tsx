"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppLogo } from "@/components/brand/app-logo";
import { HeaderNotificationsButton } from "@/components/notifications/notifications-bell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";

/**
 * Top bar on mobile only, where the sidebar is a drawer: its button, the
 * logo and the notifications. On larger screens, the sidebar holds its own button.
 */
export function AppHeader() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:hidden">
      <SidebarTrigger className="-ml-1" aria-label={t("openMenu")} />
      <Link href={DEFAULT_AUTHENTICATED_ROUTE} className="min-w-0">
        <AppLogo />
      </Link>
      <div className="ml-auto">
        <HeaderNotificationsButton />
      </div>
    </header>
  );
}
