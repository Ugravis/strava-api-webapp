"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Pages laid edge to edge, as tall as the screen: the map. Kept in step with `adminRoutes`. */
const FULL_SCREEN_PATHS = new Set(["/map"]);

/** The frame of a page: padded and centred like the pages of the site, or edge to edge for those of `FULL_SCREEN_PATHS`. */
export function PageFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (FULL_SCREEN_PATHS.has(pathname)) {
    return <div className="flex h-[calc(100svh-3.5rem)] flex-1 flex-col md:h-svh">{children}</div>;
  }
  return (
    // As the padded pages of the site.
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col p-4 md:min-h-svh md:p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">{children}</div>
    </div>
  );
}
