import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { DevPanel } from "@/components/dev/dev-panel";
import { PageHeader } from "@/components/layout/page-header";
import { StravaConnectFeedback } from "@/components/strava/strava-connect-feedback";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2 sm:py-4">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense>
        <StravaConnectFeedback />
      </Suspense>
      <Dashboard />
      {/* Temporary development tools, see backend/src/dev. */}
      {process.env.NODE_ENV === "development" && <DevPanel />}
    </div>
  );
}
