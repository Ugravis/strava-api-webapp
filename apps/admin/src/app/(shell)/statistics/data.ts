import "server-only";
import { ADMIN_BUSINESS_PERIODS, type AdminBusinessPeriod, type AdminBusinessResponses, type AdminBusinessSection } from "@kilotrace/shared/admin";
import { cache } from "react";
import { BUSINESS_TABS, type BusinessTab } from "@/components/admin/business-statistics/tabs";
import { adminApi } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/navigation";

/** What the page shows, read from its address. */
export interface BusinessView {
  period: AdminBusinessPeriod;
  team: boolean;
  tab: BusinessTab;
}

export function viewOf(params: Record<string, string | string[] | undefined>): BusinessView {
  return {
    period: ADMIN_BUSINESS_PERIODS.find((period) => period === params.period) ?? "30",
    team: params.team === "true",
    tab: BUSINESS_TABS.find((tab) => tab === params.tab) ?? "accounts",
  };
}

/** The address of the page with some of its choices changed. */
export const viewHref = (view: BusinessView, next: Partial<BusinessView>) => {
  const { period, team, tab } = { ...view, ...next };
  return `${adminRoutes.statistics}?period=${period}&team=${team}&tab=${tab}`;
};

/**
 * A section of the API, null when its call failed: each block degrades on
 * its own. Made once per request, whichever blocks share it.
 */
export const businessStatistics = cache(
  async <Section extends AdminBusinessSection>(section: Section, period: AdminBusinessPeriod, team: boolean): Promise<AdminBusinessResponses[Section] | null> => {
    const result = await adminApi<AdminBusinessResponses[Section]>(`/business-statistics/${section}?period=${period}&team=${team}`).catch(() => null);
    return result?.ok ? result.data : null;
  },
);
