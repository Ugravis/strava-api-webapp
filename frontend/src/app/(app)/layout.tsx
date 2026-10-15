import { Suspense } from "react";
import { AppShell } from "@/components/app-shell/app-shell";
import { AppShellSkeleton } from "@/components/app-shell/app-shell-skeleton";
import { DevToolbar } from "@/components/dev/dev-toolbar";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<AppShellSkeleton />}>
        <AppShell>{children}</AppShell>
      </Suspense>
      {/* Temporary development tools, see backend/src/dev. */}
      {process.env.NODE_ENV === "development" && <DevToolbar />}
    </>
  );
}
