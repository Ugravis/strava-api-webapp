import { Suspense } from "react";
import { ToAdminLink } from "@/components/admin/admin-sidebar";
import { AppShell } from "@/components/app-shell/app-shell";
import { AppShellSkeleton } from "@/components/app-shell/app-shell-skeleton";
import { DevToolbar } from "@/components/dev/dev-toolbar";

// Static import: a dynamic one breaks the `instant` validation of every page.
// The production build inlines the constant and drops the unused toolbar.
const showDevToolbar = process.env.NODE_ENV === "development";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell
          switchLink={
            // Streamed apart, so that the role check never delays the page.
            <Suspense fallback={null}>
              <ToAdminLink />
            </Suspense>
          }
        >
          {children}
        </AppShell>
      </Suspense>
      {/* Temporary development tools, see backend/src/dev. */}
      {showDevToolbar && <DevToolbar />}
    </>
  );
}
