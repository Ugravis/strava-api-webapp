"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

interface PanelLinkProps extends Omit<ComponentProps<typeof Link>, "href" | "replace"> {
  href: string;
  /** Path under which the panel is already open: a new target replaces it, so that going back closes the panel. */
  panelPrefix: string;
}

/**
 * Opens a side panel above the current page, keeping its query: the page
 * behind keeps its filters, and going back returns to it.
 */
export function PanelLink({ href, panelPrefix, ...props }: PanelLinkProps) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return (
    <Link
      href={query ? `${href}?${query}` : href}
      replace={pathname.startsWith(panelPrefix)}
      scroll={false}
      {...props}
    />
  );
}
