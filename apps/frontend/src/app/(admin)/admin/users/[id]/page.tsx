import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { UserPanel } from "../user-panel";

/** A user loaded directly, e.g. from a shared link: the panel as a page. */
export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  await requireAdminMember();
  const { id } = await params;
  return (
    <div className="flex flex-col gap-3">
      <Link href={adminRoutes.users} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden />
        {getAdminTranslations("user")("backToList")}
      </Link>
      <div className="overflow-hidden rounded-xl border bg-card">
        <UserPanel id={id} />
      </div>
    </div>
  );
}
