import "server-only";
import {
  ADMIN_SITE_ACTIVITY_PERIODS,
  type AdminSiteActivityPeriod,
  type AdminSiteActivityResponses,
  type AdminSiteActivitySection,
} from "@kilotrace/shared/admin";
import { cache } from "react";
import { adminApi } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/navigation";
import { SITE_ACTIVITY_TABS, type SiteActivityTab } from "@/components/admin/site-activity/tabs";

export const DEFAULT_DAYS: AdminSiteActivityPeriod = 30;

/** What the page shows, read from its address. */
export interface SiteActivityView {
  days: AdminSiteActivityPeriod;
  team: boolean;
  /** Whether the views of the back-office pages are counted; off by default. */
  admin: boolean;
  tab: SiteActivityTab;
}

export function viewOf(params: Record<string, string | string[] | undefined>): SiteActivityView {
  return {
    days: ADMIN_SITE_ACTIVITY_PERIODS.find((days) => String(days) === params.days) ?? DEFAULT_DAYS,
    team: params.team === "true",
    admin: params.admin === "true",
    tab: SITE_ACTIVITY_TABS.find((tab) => tab === params.tab) ?? "audience",
  };
}

/** The address of the page with some of its choices changed. */
export const viewHref = (view: SiteActivityView, next: Partial<SiteActivityView>) => {
  const { days, team, admin, tab } = { ...view, ...next };
  return `${adminRoutes.siteActivity}?days=${days}&team=${team}${admin ? "&admin=true" : ""}&tab=${tab}`;
};

/**
 * A section of the API, null when its call failed: each block degrades on
 * its own. Made once per request, whichever blocks share it.
 */
export const siteActivity = cache(
  async <Section extends AdminSiteActivitySection>(
    section: Section,
    days: AdminSiteActivityPeriod,
    team: boolean,
    admin: boolean,
  ): Promise<AdminSiteActivityResponses[Section] | null> => {
    const result = await adminApi<AdminSiteActivityResponses[Section]>(`/site-activity/${section}?days=${days}&team=${team}&admin=${admin}`).catch(() => null);
    return result?.ok ? result.data : null;
  },
);
