import { requireAdminPermission } from "@/lib/admin/access";
import { UserPanel } from "../../../users/user-panel";

/** A user opened from a page of the back office, in the panel above it. */
export default async function UserPanelPage({ params }: PageProps<"/admin/users/[id]">) {
  await requireAdminPermission("users.view");
  const { id } = await params;
  return <UserPanel id={id} />;
}
