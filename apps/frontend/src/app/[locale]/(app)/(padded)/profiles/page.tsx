import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { Suspense } from "react";
import { ProfileCardSkeleton } from "@/components/profile/profile-card";
import { CARD_WIDTH } from "@/components/profile/profile-stage";
import { ProfilesView } from "@/components/profile/profiles-view";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "profile" });
  return { title: t("title") };
}

export default async function ProfilesPage({ params }: LocaleProps) {
  await pageLocale(params);
  return (
    // The profile shown is read from the URL, on the client.
    <Suspense
      fallback={
        <div className={`m-auto ${CARD_WIDTH}`}>
          <ProfileCardSkeleton />
        </div>
      }
    >
      <ProfilesView />
    </Suspense>
  );
}
