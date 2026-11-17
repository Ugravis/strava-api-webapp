import { type AdminAppSettingsResponse, APP_SETTING_CATEGORIES, type AppSettingCategory, type SystemStatusResponse } from "@kilotrace/shared";
import type { AdminSystemOverview } from "@kilotrace/shared/admin";
import { MegaphoneIcon, RefreshCwIcon, SlidersHorizontalIcon, UsersIcon } from "lucide-react";
import { KpiGrid, KpiTile, shareOf } from "@/components/admin/kpi-tile";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { SettingsTable } from "./settings-table";
import { MaintenanceCard } from "./system-bits";

const number = new Intl.NumberFormat("fr-FR");

/** The state of the app in figures, the maintenance banner, then the settings of the site: every member reads, each action behind its permission. */
export default async function AdminSystemPage() {
  const { permissions } = await requireAdminMember();
  const can = (permission: "system.maintenance" | "system.settings") => permissions.includes(permission);
  const t = getAdminTranslations("system");
  const categories = getAdminTranslations("system.settings.categories");
  const [status, settings, overview] = await Promise.all([
    adminApi<SystemStatusResponse>("/system"),
    adminApi<AdminAppSettingsResponse>("/system/settings"),
    adminApi<AdminSystemOverview>("/system/overview"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {!can("system.maintenance") && !can("system.settings") && <p className="text-sm text-muted-foreground">{t("readOnly")}</p>}
      <Figures status={status.ok ? status.data : null} settings={settings.ok ? settings.data : null} overview={overview.ok ? overview.data : null} />
      {status.ok ? (
        <MaintenanceCard maintenance={status.data.maintenance} canEdit={can("system.maintenance")} />
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("statusError")}</p>
      )}
      <Separator />
      <SettingsTable
        canEdit={can("system.settings")}
        categories={Object.fromEntries(APP_SETTING_CATEGORIES.map((category) => [category, categories(`${category}.title`)])) as Record<AppSettingCategory, string>}
      />
    </>
  );
}

/** Banner, accounts against their cap, the Strava worker and the settings changed. */
function Figures({ status, settings, overview }: { status: SystemStatusResponse | null; settings: AdminAppSettingsResponse | null; overview: AdminSystemOverview | null }) {
  const t = getAdminTranslations("system.overview");
  const value = <K extends AdminAppSettingsResponse[number]["key"]>(key: K) => settings?.find((setting) => setting.key === key)?.value;
  const cap = value("maxAccounts");
  const syncing = value("stravaSyncEnabled");
  const changed = settings?.filter((setting) => setting.updatedAt !== null && setting.value !== setting.defaultValue) ?? [];
  const last = changed.map((setting) => setting.updatedAt!).sort().at(-1);
  const banner = status?.maintenance;
  return (
    <KpiGrid columns={4}>
      <KpiTile
        icon={MegaphoneIcon}
        color="orange"
        label={t("banner")}
        value={!status ? "—" : banner ? t("bannerOn") : t("bannerOff")}
        detail={banner ? t("bannerSince", { date: formatDateTime(banner.since) }) : t("bannerOffDetail")}
      />
      <KpiTile
        icon={UsersIcon}
        color="blue"
        label={t("accounts")}
        value={overview ? number.format(overview.accounts) : "—"}
        detail={typeof cap === "number" ? t("accountsCap", { max: number.format(cap) }) : t("accountsNoCap")}
        gauge={overview && typeof cap === "number" ? shareOf(overview.accounts, cap) : undefined}
      />
      <KpiTile
        icon={RefreshCwIcon}
        color="aqua"
        label={t("strava")}
        value={syncing === undefined ? "—" : syncing ? t("stravaOn") : t("stravaOff")}
        detail={overview ? t("stravaPending", { events: overview.strava.pendingEvents, jobs: overview.strava.pendingJobs }) : "—"}
      />
      <KpiTile
        icon={SlidersHorizontalIcon}
        color="yellow"
        label={t("settings")}
        value={settings ? t("settingsChanged", { count: changed.length, total: settings.length }) : "—"}
        detail={last ? t("settingsLast", { when: formatRelative(last) }) : t("settingsDefault")}
        gauge={settings ? shareOf(changed.length, settings.length) : undefined}
      />
    </KpiGrid>
  );
}
