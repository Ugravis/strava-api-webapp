import "server-only";
import type { SystemStatusResponse } from "@kilotrace/shared";
import { getTranslations } from "next-intl/server";
import { serverApiGet } from "@/lib/api/server";
import { MaintenanceBanner } from "./maintenance-banner";

/** The maintenance banner set from the back office, when there is one. */
export async function MaintenanceNotice() {
  const result = await serverApiGet<SystemStatusResponse>("/system/status").catch(() => null);
  const maintenance = result?.ok ? result.data.maintenance : null;
  if (!maintenance) {
    return null;
  }
  const t = await getTranslations("maintenance.titles");
  return <MaintenanceBanner title={t(maintenance.title)} description={maintenance.description} />;
}
