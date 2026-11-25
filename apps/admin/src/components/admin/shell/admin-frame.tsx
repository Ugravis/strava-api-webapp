import type { AdminRole } from "@kilotrace/shared/admin";
import { SplitPanelArea, SplitPanelProvider } from "@kilotrace/ui/components/split-panel";
import type { ReactNode } from "react";
import { AdminNavigation, ToAppLink } from "@/components/admin/admin-sidebar";
import { AdminShell } from "./admin-shell";
import { PageFrame } from "./page-frame";

/** Sidebar, side panel and page frame of the back office, for a member of the team. */
export function AdminFrame({ roles, children }: { roles: AdminRole[]; children: ReactNode }) {
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
