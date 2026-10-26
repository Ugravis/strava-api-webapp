"use client";

import { useTranslations } from "next-intl";
import { ProfileVisibilitySwitch } from "@/components/profile/profile-visibility-switch";
import { SettingsSection } from "./settings-section";

export function PrivacySettings() {
  const t = useTranslations("settings.privacy");

  return (
    <SettingsSection id="privacy" title={t("title")} description={t("description")}>
      <ProfileVisibilitySwitch />
    </SettingsSection>
  );
}
