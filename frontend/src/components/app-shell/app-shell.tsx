import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { TrackSyncProvider } from "@/components/tracks/track-sync-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserProvider } from "@/components/user/user-provider";
import { requireUser } from "@/lib/auth/session";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";

/** Cookie written by the shadcn sidebar to remember its collapsed state. */
const SIDEBAR_STATE_COOKIE = "sidebar_state";

/** Authenticated layout: resolves the session, then renders the sidebar and content. */
export async function AppShell({ children }: { children: ReactNode }) {
  const [user, cookieStore] = await Promise.all([requireUser(), cookies()]);
  const sidebarOpen = cookieStore.get(SIDEBAR_STATE_COOKIE)?.value !== "false";

  return (
    <UserProvider user={user}>
      <TrackSyncProvider userId={user.id}>
        <SidebarProvider defaultOpen={sidebarOpen}>
          <AppSidebar user={user} />
          <SidebarInset>
            <AppHeader />
            <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TrackSyncProvider>
    </UserProvider>
  );
}
