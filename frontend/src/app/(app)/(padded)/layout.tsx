import { SiteFooter } from "@/components/layout/site-footer";

/** Pages laid out with margins, unlike the map which fills the space beside the sidebar. */
export default function PaddedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* At least the height of the window (below the mobile header), so that the footer never shows right away. */}
      <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col p-4 md:min-h-svh md:p-6">{children}</div>
      <SiteFooter authenticated />
    </>
  );
}
