import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { PocView } from "./poc-view";

/** Temporary: the shared table of the back office, designed here on fake rows (#133). */
export default async function AdminTablePocPage() {
  await requireAdminMember();
  return (
    <>
      <PageHeader title="Tableaux (POC)" description="Données fictives, aux formes des tableaux de l'admin." />
      <PocView />
    </>
  );
}
