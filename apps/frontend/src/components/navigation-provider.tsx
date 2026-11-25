"use client";

import { type AppNavigation, NavigationProvider } from "@kilotrace/ui/lib/navigation";
import type { ReactNode } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const localized: AppNavigation = { Link, usePathname, useRouter };

/** Hands the localized navigation of the site to the shared components. */
export function LocalizedNavigation({ children }: { children: ReactNode }) {
  return <NavigationProvider value={localized}>{children}</NavigationProvider>;
}
