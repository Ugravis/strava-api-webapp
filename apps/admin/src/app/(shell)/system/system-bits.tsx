import "server-only";
import { cache } from "react";
import { MAINTENANCE_DESCRIPTION_MAX_LENGTH, MAINTENANCE_TITLES, type MaintenanceBanner, type SystemStatusResponse } from "@kilotrace/shared";
import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminDatabaseTable,
  type AdminUploadsAudit,
} from "@kilotrace/shared/admin";
import { DatabaseIcon, FileImageIcon, FileWarningIcon, MapIcon, MegaphoneOffIcon, PencilIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ActionForm } from "@/components/admin/action-form";
import { FormDialog } from "@/components/admin/form-dialog";
import { DataTableSkeleton } from "@kilotrace/ui/components/admin/data-table";
import { KpiGrid, KpiTile, KpiTileSkeleton, shareOf } from "@/components/admin/kpi-tile";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/ui/card";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { adminApi } from "@/lib/admin/api";
import { formatBytes, formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { clearMaintenance, deleteOrphans, setMaintenance, setShowcase, setSignups } from "./actions";
import { SiteSwitch, type SiteSwitchTexts } from "./site-switch";
import { DatabaseTable } from "./database-table";
import { HeaviestTable, OrphansTable } from "./uploads-tables";

/** The banner shown to the signed-in users, and its form for the super-admins. */
export function MaintenanceCard({ maintenance, canEdit }: { maintenance: MaintenanceBanner | null; canEdit: boolean }) {
  const t = getAdminTranslations("system.maintenance");
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {maintenance ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t(`titles.${maintenance.title}`)}</p>
              <p className="mt-1 whitespace-pre-line text-amber-900/80 dark:text-amber-200/80">
                {maintenance.description ?? t("noDescription")}
              </p>
              <p className="mt-2 text-xs opacity-80">{t("since", { date: formatDateTime(maintenance.since) })}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("off")}</p>
        )}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <MaintenanceFormDialog maintenance={maintenance} />
            {maintenance && (
              <ActionForm action={clearMaintenance} quiet>
                <SubmitButton size="sm" variant="outline">
                  <MegaphoneOffIcon />
                  {t("turnOff")}
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceFormDialog({ maintenance }: { maintenance: MaintenanceBanner | null }) {
  const t = getAdminTranslations("system.maintenance");
  return (
    <FormDialog
      action={setMaintenance}
      quiet
      trigger={
        maintenance
          ? { label: t("edit"), icon: <PencilIcon />, variant: "outline" }
          : { label: t("turnOn"), icon: <TriangleAlertIcon />, variant: "default" }
      }
      title={t("form.title")}
      description={t("form.description")}
      submitLabel={t("form.submit")}
      cancelLabel={getAdminTranslations("common")("cancel")}
      fields={[
        {
          kind: "select",
          name: "title",
          label: t("form.titleField"),
          defaultValue: maintenance?.title ?? MAINTENANCE_TITLES[0],
          options: MAINTENANCE_TITLES.map((title) => ({ value: title, label: t(`titles.${title}`) })),
        },
        {
          kind: "textarea",
          name: "description",
          label: t("form.descriptionField"),
          hint: t("form.descriptionHint", { max: MAINTENANCE_DESCRIPTION_MAX_LENGTH }),
          defaultValue: maintenance?.description ?? "",
          maxLength: MAINTENANCE_DESCRIPTION_MAX_LENGTH,
        },
      ]}
    />
  );
}

/** Switches of the whole site, each asked first both ways. */
export function SwitchesCard({ status, can }: { status: SystemStatusResponse; can: (permission: "system.signups" | "system.showcase") => boolean }) {
  const t = getAdminTranslations("system.switches");
  const cancel = getAdminTranslations("common")("cancel");
  const texts = (key: "signups" | "showcase"): SiteSwitchTexts => ({
    label: t(`${key}.label`),
    description: t(`${key}.description`),
    off: { title: t(`${key}.off.title`), description: t(`${key}.off.description`), submit: t(`${key}.off.submit`) },
    on: { title: t(`${key}.on.title`), description: t(`${key}.on.description`), submit: t(`${key}.on.submit`) },
    cancel,
  });
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        <SiteSwitch
          checked={status.signupsEnabled}
          action={setSignups.bind(null, !status.signupsEnabled)}
          canEdit={can("system.signups")}
          texts={texts("signups")}
        />
        <SiteSwitch
          checked={status.profileShowcaseEnabled}
          action={setShowcase.bind(null, !status.profileShowcaseEnabled)}
          canEdit={can("system.showcase")}
          texts={texts("showcase")}
        />
      </CardContent>
    </Card>
  );
}

/** Read by the figures and by the table of the page: once per request. */
const databaseTables = cache(() => adminApi<AdminDatabaseTable[]>("/system/database").catch(() => null));

/** Weight of the stored files, read from the storage on every visit: streamed apart. */
export async function UploadsAudit({ canEdit }: { canEdit: boolean }) {
  const t = getAdminTranslations("system.uploads");
  const [result, database] = await Promise.all([adminApi<AdminUploadsAudit>("/system/uploads").catch(() => null), databaseTables()]);
  if (!result?.ok) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>;
  }
  const { avatars, heaviest, orphans, previews } = result.data;
  const common = getAdminTranslations("common");
  const stored = avatars.bytes + orphans.bytes + previews.bytes;

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid columns={4}>
        <DatabaseTile tables={database?.ok ? database.data : null} />
        <KpiTile icon={FileImageIcon} color="blue" label={t("avatars")} value={formatBytes(avatars.bytes)} detail={t("files", { count: avatars.count })} gauge={shareOf(avatars.bytes, stored)} />
        <KpiTile icon={FileWarningIcon} color="aqua" label={t("orphans")} value={formatBytes(orphans.bytes)} detail={t("files", { count: orphans.count })} gauge={shareOf(orphans.bytes, stored)} />
        <KpiTile
          icon={MapIcon}
          color="orange"
          label={t("previews")}
          value={formatBytes(previews.bytes)}
          detail={`${t("files", { count: previews.count })} · ${t("previewsHint")}`}
          gauge={shareOf(previews.bytes, stored)}
        />
      </KpiGrid>

      <Separator />
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("heaviest")}</h3>
        <HeaviestTable files={heaviest} />
      </div>

      <Separator />
      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-medium">{t("orphansTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("orphansDescription")}</p>
        </div>
        <OrphansTable files={orphans.files} />
        {orphans.count > 0 && (
          <>
            {orphans.count > orphans.files.length && (
              <p className="text-xs text-muted-foreground">{t("orphansMore", { count: orphans.count - orphans.files.length })}</p>
            )}
            {canEdit && (
              <div>
                <ActionDialog
                  action={deleteOrphans}
                  trigger={{ label: t("delete.trigger"), icon: <Trash2Icon /> }}
                  title={t("delete.title")}
                  description={t("delete.description")}
                  submitLabel={t("delete.submit")}
                  cancelLabel={common("cancel")}
                  destructive
                  reason={{
                    label: common("reason"),
                    placeholder: common("reasonPlaceholder"),
                    hint: common("reasonHint", { min: ADMIN_REASON_MIN_LENGTH, max: ADMIN_REASON_MAX_LENGTH }),
                    presetsLabel: common("presets"),
                    presets: t.raw("delete.presets") as string[],
                    required: true,
                    min: ADMIN_REASON_MIN_LENGTH,
                    max: ADMIN_REASON_MAX_LENGTH,
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Weight of the tables of the database, indexes included. */
function DatabaseTile({ tables }: { tables: AdminDatabaseTable[] | null }) {
  const t = getAdminTranslations("system.database");
  if (!tables) {
    return <KpiTile icon={DatabaseIcon} color="yellow" label={t("weight")} value="—" detail={t("error")} />;
  }
  const total = tables.reduce((sum, table) => sum + table.totalBytes, 0);
  const indexes = tables.reduce((sum, table) => sum + table.indexBytes, 0);
  return (
    <KpiTile
      icon={DatabaseIcon}
      color="yellow"
      label={t("weight")}
      value={formatBytes(total)}
      detail={t("weightDetail", { count: tables.length, indexes: formatBytes(indexes) })}
      gauge={shareOf(indexes, total)}
    />
  );
}

export function UploadsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <KpiGrid columns={4}>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </KpiGrid>
      <DataTableSkeleton rows={5} />
    </div>
  );
}

/** The tables of the database, read from the catalogs on every visit: streamed apart. */
export async function DatabaseSection() {
  const t = getAdminTranslations("system.database");
  const result = await databaseTables();
  if (!result?.ok) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>;
  }
  return <DatabaseTable tables={result.data} />;
}

export function DatabaseSkeleton() {
  return <DataTableSkeleton rows={10} />;
}
