import "server-only";
import { MAINTENANCE_DESCRIPTION_MAX_LENGTH, MAINTENANCE_TITLES, type MaintenanceBanner } from "@kilotrace/shared";
import { MegaphoneOffIcon, PencilIcon, TriangleAlertIcon } from "lucide-react";
import { ActionForm } from "@/components/admin/action-form";
import { FormDialog } from "@/components/admin/form-dialog";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/ui/card";
import { formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { clearMaintenance, setMaintenance } from "./actions";

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
