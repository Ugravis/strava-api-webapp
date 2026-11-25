import { AppShellSkeleton } from "@kilotrace/ui/components/app-shell/app-shell-skeleton";
import { Suspense } from "react";
import { AdminFrame } from "@/components/admin/shell/admin-frame";
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
  return <AdminFrame roles={roles}>{children}</AdminFrame>;
}
