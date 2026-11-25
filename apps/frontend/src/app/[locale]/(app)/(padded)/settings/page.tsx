import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";
import { Suspense } from "react";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { AvatarSettings } from "@/components/settings/avatar-settings";
import { ConnectionsSettings } from "@/components/settings/connections-settings";
import { DeleteAccountSettings } from "@/components/settings/delete-account-settings";
import { PasswordSettings } from "@/components/settings/password-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { StravaConnectFeedback } from "@/components/strava/strava-connect-feedback";
import { profileShowcaseEnabled } from "@/lib/system/status";

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const t = await getTranslations({ locale: await pageLocale(params), namespace: "settings" });
  return { title: t("title") };
}

export default async function SettingsPage({ params }: LocaleProps) {
  await pageLocale(params);
  const [t, showcase] = await Promise.all([getTranslations("settings"), profileShowcaseEnabled()]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2 sm:py-4">
      <PageHeader title={t("title")} description={t("description")} />
      <AvatarSettings />
      <ProfileSettings />
      <PrivacySettings showcase={showcase} />
      <Suspense>
        <StravaConnectFeedback />
      </Suspense>
      <ConnectionsSettings />
      <PasswordSettings />
      <DeleteAccountSettings />
    </div>
  );
}
