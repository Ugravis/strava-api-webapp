import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { PocOrderTable } from "./poc-order";
import { PocView } from "./poc-view";

/** Showcase of the data table kit on fake rows (#133): every feature, on the kit as it is now. */
export default async function AdminTablePocPage() {
  await requireAdminMember();
  const t = getAdminTranslations("development");
  return (
    <>
      <Link href={adminRoutes.development} className="-mb-4 inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        {t("title")}
      </Link>
      <PageHeader title={t("prototypes.adminTable.title")} description={t("prototypes.adminTable.liveHint")} />
      <PocView />
      <PocOrderTable />
    </>
  );
}
