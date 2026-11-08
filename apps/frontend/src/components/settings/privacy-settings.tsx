"use client";

import { useTranslations } from "next-intl";
import { ProfileVisibilitySwitch } from "@/components/profile/profile-visibility-switch";
import { SettingsSection } from "./settings-section";

export function PrivacySettings({ showcase }: { showcase: boolean }) {
  const t = useTranslations("settings.privacy");

  return (
    <SettingsSection id="privacy" title={t("title")} description={t("description")}>
      <ProfileVisibilitySwitch showcase={showcase} />
    </SettingsSection>
  );
}
