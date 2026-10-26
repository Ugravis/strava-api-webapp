"use client";

import { useTranslations } from "next-intl";
import { StravaConnectionSetting } from "./strava-connection-setting";
import { SettingsSection } from "./settings-section";

/** Data providers the user can link. Only Strava for now. */
export function ConnectionsSettings() {
  const t = useTranslations("settings.connections");

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      <ul className="flex flex-col divide-y">
        <li className="py-1 first:pt-0 last:pb-0">
          <StravaConnectionSetting />
        </li>
      </ul>
    </SettingsSection>
  );
}
