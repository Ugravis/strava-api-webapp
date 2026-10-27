import { AdminRole } from "@kilotrace/shared/admin";
import { requireAdminRole } from "@/lib/admin/access";
import { UserPanel } from "../../../users/user-panel";

/** A user opened from a page of the back office, in the panel above it. */
export default async function UserPanelPage({ params }: PageProps<"/admin/users/[id]">) {
  await requireAdminRole(AdminRole.Support);
  const { id } = await params;
  return <UserPanel id={id} />;
}
