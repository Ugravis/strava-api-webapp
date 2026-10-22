import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AppShellSkeleton } from "@/components/app-shell/app-shell-skeleton";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  // Imported on demand: the production build drops the branch, so the tools never ship.
  const DevToolbar =
    process.env.NODE_ENV === "development"
      ? (await import("@/components/dev/dev-toolbar")).DevToolbar
      : null;

  return (
    <>
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell>{children}</AppShell>
      </Suspense>
      {/* Temporary development tools, see backend/src/dev. */}
      {DevToolbar && <DevToolbar />}
    </>
  );
}
