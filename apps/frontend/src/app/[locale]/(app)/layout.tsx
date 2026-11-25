import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AppShellSkeleton } from "@kilotrace/ui/components/app-shell/app-shell-skeleton";
import { DevToolbar } from "@/components/dev/dev-toolbar";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";

// Static import: a dynamic one breaks the `instant` validation of every page.
// The production build inlines the constant and drops the unused toolbar.
const showDevToolbar = process.env.NODE_ENV === "development";

export default async function AuthenticatedLayout({ children, params }: LocaleProps & { children: React.ReactNode }) {
  await pageLocale(params);
  return (
    <>
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell>{children}</AppShell>
      </Suspense>
      {/* Temporary development tools, see backend/src/dev. */}
      {showDevToolbar && <DevToolbar />}
    </>
  );
}
