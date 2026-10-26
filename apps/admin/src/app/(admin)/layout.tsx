import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@kilotrace/ui/components/sidebar";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { routes } from "@/config/routes";
import { getAdminMe } from "@/lib/api/server";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const me = await getAdminMe();
  if (!me) {
    redirect(routes.login);
  }

  return (
    <SidebarProvider>
      <AdminSidebar me={me} />
      <SidebarInset>
        <header className="flex h-14 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
