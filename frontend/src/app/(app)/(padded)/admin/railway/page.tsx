import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Import des gares" };

/** Development only, like the other tools of `backend/src/dev`: the report of the latest import of the stations. */
export default async function RailwayImportPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  // Imported on demand, so that the production build leaves the report out.
  const { RailwayImportReport } = await import("@/components/dev/railway-import-report");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 sm:py-4">
      <PageHeader
        title="Import des gares"
        description="Rapport du dernier import OpenStreetMap : gares gardées ou exclues, liaisons et cas à vérifier."
      />
      <RailwayImportReport />
    </div>
  );
}
