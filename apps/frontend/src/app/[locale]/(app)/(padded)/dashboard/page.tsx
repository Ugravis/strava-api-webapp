import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { StravaConnectFeedback } from "@/components/strava/strava-connect-feedback";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "dashboard" });
  return { title: t("title") };
}

export default async function DashboardPage({ params }: LocaleProps) {
  await pageLocale(params);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-2 sm:py-4">
      <Suspense>
        <StravaConnectFeedback />
      </Suspense>
      <Dashboard />
    </div>
  );
}
