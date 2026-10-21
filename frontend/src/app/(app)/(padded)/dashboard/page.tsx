import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { StravaConnectFeedback } from "@/components/strava/strava-connect-feedback";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 py-2 sm:py-4">
      <Suspense>
        <StravaConnectFeedback />
      </Suspense>
      <Dashboard />
    </div>
  );
}
