import "server-only";
import { PersistedSidebarProvider, SIDEBAR_STATE_COOKIE } from "@kilotrace/ui/components/app-shell/sidebar-state";
import { SidebarInset } from "@kilotrace/ui/components/ui/sidebar";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { requireAdminMember } from "@/lib/admin/access";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar-frame";

/**
 * Frame of the back office: its own sidebar and mobile header, nothing of
 * the site (notifications, tracks, follows). Without a session of the back
 * office, the proxy already sent the browser to the sign-in.
 */
export async function AdminShell({
  navigation,
  switchLink,
  children,
}: {
  navigation: ReactNode;
  switchLink: ReactNode;
  children: ReactNode;
}) {
  const [me, cookieStore] = await Promise.all([requireAdminMember(), cookies()]);
  const sidebarOpen = cookieStore.get(SIDEBAR_STATE_COOKIE)?.value !== "false";

  return (
    <PersistedSidebarProvider defaultOpen={sidebarOpen}>
      <AdminSidebar user={me} navigation={navigation} switchLink={switchLink} />
      {/* Never wider than the space beside the sidebar, whatever its content: no sideways scroll. */}
      <SidebarInset className="min-w-0">
        <AdminHeader />
        {children}
      </SidebarInset>
    </PersistedSidebarProvider>
  );
}
