import { AdminRole } from "@kilotrace/shared/admin";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AdminNavigation, ToAppLink } from "@/components/admin/admin-sidebar";
import { AppShell } from "@/components/app-shell/app-shell";
import { AppShellSkeleton } from "@kilotrace/ui/components/app-shell/app-shell-skeleton";
import { SiteFooter } from "@/components/layout/site-footer";
import { SplitPanelArea, SplitPanelProvider } from "@kilotrace/ui/components/split-panel";
import { requireAdminRole } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";

// Never indexed; the section is also left out of robots.txt and the sitemap,
// which would disclose it.
/**
 * Its fields in the size of its text, 14 px, also on a phone, where Safari
 * would zoom on any field under 16 px as it is focused: kept from it. A
 * pinch still zooms on iOS.
 */
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export const metadata: Metadata = {
  title: getAdminTranslations("layout")("title"),
  robots: { index: false, follow: false },
};

/**
 * Back office, rendered on the server only, in the frame of the site with a
 * sidebar of its own. The proxy already answers the 404 of an unknown page
 * to anyone without a role; the check is repeated here, as on every page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const roles = await requireAdminRole(AdminRole.Support);

  return (
    <AppShell
      navigation={<AdminNavigation />}
      switchLink={<ToAppLink roles={roles} />}
      homeHref={adminRoutes.dashboard}
    >
      {/* The detail of a row, on the right of any page, above the footer. */}
      <SplitPanelProvider>
        <SplitPanelArea>
          {/* As the padded pages of the site. */}
          <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col p-4 md:min-h-svh md:p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">{children}</div>
          </div>
        </SplitPanelArea>
        <SiteFooter authenticated />
      </SplitPanelProvider>
    </AppShell>
  );
}
