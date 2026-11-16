import { SplitPanelArea, SplitPanelProvider } from "@kilotrace/ui/components/split-panel";
import { AppShellSkeleton } from "@kilotrace/ui/components/app-shell/app-shell-skeleton";
import { Suspense } from "react";
import { AdminNavigation, ToAppLink } from "@/components/admin/admin-sidebar";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { PageFrame } from "@/components/admin/shell/page-frame";
import { requireAdminMember } from "@/lib/admin/access";

/**
 * Back office, rendered on the server only, in a frame of its own. Without
 * a session, the proxy sends to the sign-in; the session is checked again
 * here and on every page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { roles } = await requireAdminMember();

  return (
    <AdminShell navigation={<AdminNavigation />} switchLink={<ToAppLink roles={roles} />}>
      {/* The detail of a row, on the right of any page. */}
      <SplitPanelProvider>
        <SplitPanelArea>
          <PageFrame>{children}</PageFrame>
        </SplitPanelArea>
      </SplitPanelProvider>
    </AdminShell>
  );
}
