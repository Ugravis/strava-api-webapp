import "server-only";
import { MAINTENANCE_DESCRIPTION_MAX_LENGTH, MAINTENANCE_TITLES, type MaintenanceBanner } from "@kilotrace/shared";
import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminUploadFile,
  type AdminUploadsAudit,
} from "@kilotrace/shared/admin";
import { FileImageIcon, FileWarningIcon, MapIcon, MegaphoneOffIcon, PencilIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ActionForm } from "@/components/admin/action-form";
import { FormDialog } from "@/components/admin/form-dialog";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { SubmitButton } from "@/components/admin/submit-button";
import { UserLink } from "@/components/admin/user-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin/api";
import { formatBytes, formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { clearMaintenance, deleteOrphans, setMaintenance, setSignups } from "./actions";

const cell = "px-3 py-2";

/** The banner shown to the signed-in users, and its form for the super-admins. */
export function MaintenanceCard({ maintenance, canEdit }: { maintenance: MaintenanceBanner | null; canEdit: boolean }) {
  const t = getAdminTranslations("system.maintenance");
  return (
    <Card size="sm">
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
              <ActionForm action={clearMaintenance}>
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

/** The kill switch of the sign-ups, confirmed both ways. */
export function SignupsCard({ enabled, canEdit }: { enabled: boolean; canEdit: boolean }) {
  const t = getAdminTranslations("system.signups");
  const step = enabled ? "close" : "reopen";
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")}
          <Badge variant={enabled ? "secondary" : "destructive"}>{t(enabled ? "open" : "closed")}</Badge>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      {canEdit && (
        <CardContent>
          <ActionDialog
            action={setSignups.bind(null, !enabled)}
            trigger={{ label: t(`${step}.trigger`) }}
            title={t(`${step}.title`)}
            description={t(`${step}.description`)}
            submitLabel={t(`${step}.submit`)}
            cancelLabel={getAdminTranslations("common")("cancel")}
            destructive={enabled}
          />
        </CardContent>
      )}
    </Card>
  );
}

/** Weight of the stored files, read from the storage on every visit: streamed apart. */
export async function UploadsAudit({ canEdit }: { canEdit: boolean }) {
  const t = getAdminTranslations("system.uploads");
  const result = await adminApi<AdminUploadsAudit>("/system/uploads").catch(() => null);
  if (!result?.ok) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>;
  }
  const { avatars, heaviest, orphans, previews } = result.data;
  const common = getAdminTranslations("common");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={FileImageIcon} label={t("avatars")} value={formatBytes(avatars.bytes)} detail={t("files", { count: avatars.count })} />
        <StatTile icon={FileWarningIcon} label={t("orphans")} value={formatBytes(orphans.bytes)} detail={t("files", { count: orphans.count })} />
        <StatTile
          icon={MapIcon}
          label={t("previews")}
          value={formatBytes(previews.bytes)}
          detail={`${t("files", { count: previews.count })} · ${t("previewsHint")}`}
        />
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("heaviest")}</CardTitle>
        </CardHeader>
        <CardContent>
          {heaviest.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("heaviestEmpty")}</p>
          ) : (
            <FilesTable files={heaviest} withUser />
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("orphansTitle")}</CardTitle>
          <CardDescription>{t("orphansDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orphans.count === 0 ? (
            <p className="text-sm text-muted-foreground">{t("orphansEmpty")}</p>
          ) : (
            <>
              <FilesTable files={orphans.files} />
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
        </CardContent>
      </Card>
    </div>
  );
}

function FilesTable({ files, withUser }: { files: AdminUploadFile[]; withUser?: boolean }) {
  const t = getAdminTranslations("system.uploads.columns");
  const log = getAdminTranslations("auditLog");
  return (
    // Every column stays, the table scrolling sideways on narrow screens.
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-xl text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className={`${cell} font-medium`}>{t("file")}</th>
            {withUser && <th className={`${cell} font-medium`}>{t("user")}</th>}
            <th className={`${cell} text-right font-medium`}>{t("size")}</th>
            <th className={`${cell} font-medium`}>{t("date")}</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.key} className="border-t odd:bg-background even:bg-muted/50">
              <td className={`${cell} max-w-64 truncate font-mono text-xs`} title={file.key}>
                {file.key}
              </td>
              {withUser && (
                <td className={cell}>
                  <UserLink user={file.user} fallback="—" deleted={log("deleted")} />
                </td>
              )}
              <td className={`${cell} text-right tabular-nums`}>{formatBytes(file.bytes)}</td>
              <td className={`${cell} text-muted-foreground`}>{file.lastModified ? formatDateTime(file.lastModified) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UploadsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
