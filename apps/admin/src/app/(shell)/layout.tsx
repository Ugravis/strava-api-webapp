import { SplitPanelArea, SplitPanelProvider } from "@kilotrace/ui/components/split-panel";
import { AppShellSkeleton } from "@kilotrace/ui/components/app-shell/app-shell-skeleton";
import { Suspense } from "react";
import { AdminNavigation, ToAppLink } from "@/components/admin/admin-sidebar";
import { AdminShell } from "@/components/admin/shell/admin-shell";
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
          {/* As the padded pages of the site. */}
          <div className="flex min-h-[calc(100svh-3.5rem)] flex-1 flex-col p-4 md:min-h-svh md:p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">{children}</div>
          </div>
        </SplitPanelArea>
      </SplitPanelProvider>
    </AdminShell>
  );
}
