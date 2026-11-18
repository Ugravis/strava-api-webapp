import { SectionTitleSkeleton } from "@/components/admin/page-skeleton";
import { PageHeaderSkeleton } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { DatabaseSkeleton, UploadsSkeleton } from "./database-bits";

/** Placeholder of the database page, in its layout: header, the stored files, then the tables. */
export default function AdminDatabaseLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <PageHeaderSkeleton width="w-48" />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton description />
        <UploadsSkeleton />
      </section>
      <Separator />
      <section className="flex flex-col gap-3">
        <SectionTitleSkeleton description />
        <DatabaseSkeleton />
      </section>
    </div>
  );
}
