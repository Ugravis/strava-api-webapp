import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AvatarSettings } from "@/components/settings/avatar-settings";
import { ConnectionsSettings } from "@/components/settings/connections-settings";
import { DeleteAccountSettings } from "@/components/settings/delete-account-settings";
import { PasswordSettings } from "@/components/settings/password-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { StravaConnectFeedback } from "@/components/strava/strava-connect-feedback";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default function SettingsPage() {
  const t = useTranslations("settings");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2 sm:py-4">
      <PageHeader title={t("title")} description={t("description")} />
      <AvatarSettings />
      <ProfileSettings />
      <PrivacySettings />
      <Suspense>
        <StravaConnectFeedback />
      </Suspense>
      <ConnectionsSettings />
      <PasswordSettings />
      <DeleteAccountSettings />
    </div>
  );
}
