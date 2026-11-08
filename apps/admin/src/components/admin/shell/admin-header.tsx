"use client";

import { AppLogo } from "@kilotrace/ui/components/brand/app-logo";
import { SidebarTrigger } from "@kilotrace/ui/components/ui/sidebar";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** Top bar on mobile only, where the sidebar is a drawer: its button and the logo. */
export function AdminHeader() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:hidden">
      <SidebarTrigger className="-ml-1" aria-label={t("openMenu")} />
      <Link href="/dashboard" className="min-w-0">
        <AppLogo />
      </Link>
    </header>
  );
}
