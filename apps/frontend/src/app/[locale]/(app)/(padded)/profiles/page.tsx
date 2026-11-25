import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ProfileCardSkeleton } from "@/components/profile/profile-card";
import { CARD_WIDTH } from "@/components/profile/profile-stage";
import { ProfilesView } from "@/components/profile/profiles-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default function ProfilesPage() {
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
