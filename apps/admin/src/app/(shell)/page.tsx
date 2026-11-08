import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/admin/navigation";

/** The entry of the back office opens on its dashboard. */
export default function AdminIndexPage() {
  redirect(adminRoutes.dashboard);
}
