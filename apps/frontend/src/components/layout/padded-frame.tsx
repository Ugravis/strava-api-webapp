import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";

/** Margins and footer of the signed-in pages, unlike the map which fills the space beside the sidebar. */
export function PaddedFrame({ children }: { children: ReactNode }) {
  return (
    <>
      {/* At least the height of the window (below the mobile header), so that the footer never shows right away. */}
      <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col p-4 md:min-h-svh md:p-6">{children}</div>
      <SiteFooter authenticated />
    </>
  );
}
