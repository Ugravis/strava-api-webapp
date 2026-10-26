import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { FollowsSummaryProvider } from "@/components/community/follows-summary-provider";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { TrackSyncProvider } from "@/components/tracks/track-sync-provider";
import { SidebarInset } from "@/components/ui/sidebar";
import { UserProvider } from "@/components/user/user-provider";
import { requireUser } from "@/lib/auth/session";
import { AppHeader } from "./app-header";
import { AppSidebar, type AppSidebarSlots } from "./app-sidebar";
import { PersistedSidebarProvider, SIDEBAR_STATE_COOKIE } from "./sidebar-state";

/**
 * Authenticated layout: resolves the session, then renders the sidebar and
 * content. The slots fill the sidebar of another part of the site.
 */
export async function AppShell({ children, ...slots }: AppSidebarSlots & { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  const sidebarOpen = cookieStore.get(SIDEBAR_STATE_COOKIE)?.value !== "false";

  return (
    <UserProvider user={user}>
      <TrackSyncProvider userId={user.id}>
        <NotificationsProvider>
          <FollowsSummaryProvider>
            <PersistedSidebarProvider defaultOpen={sidebarOpen}>
              <AppSidebar user={user} {...slots} />
              {/* Never wider than the space beside the sidebar, whatever its content: no sideways scroll. */}
              <SidebarInset className="min-w-0">
                <AppHeader />
                {children}
              </SidebarInset>
            </PersistedSidebarProvider>
          </FollowsSummaryProvider>
        </NotificationsProvider>
      </TrackSyncProvider>
    </UserProvider>
  );
}
