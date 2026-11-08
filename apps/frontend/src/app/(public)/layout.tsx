import { PublicNavbar } from "@/components/layout/public-navbar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      {/* At least the height of the window below the navbar, so that the footer never shows right away. */}
      <main className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
