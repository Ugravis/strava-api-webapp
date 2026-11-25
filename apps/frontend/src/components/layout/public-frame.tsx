import type { ReactNode } from "react";
import { PublicNavbar } from "./public-navbar";
import { SiteFooter } from "./site-footer";

/** The navbar and footer of the public pages, around their content. */
export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNavbar />
      {/* At least the height of the window below the navbar, so that the footer never shows right away. */}
      <main className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
