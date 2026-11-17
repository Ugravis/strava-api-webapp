import "server-only";
import {
  type AdminAppSetting,
  type AdminAppSettingsResponse,
  APP_SETTING_CATEGORIES,
  APP_SETTINGS,
  type AppSettingCategory,
} from "@kilotrace/shared";
import { PencilIcon, RotateCcwIcon } from "lucide-react";
import { ActionForm } from "@/components/admin/action-form";
import { FormDialog } from "@/components/admin/form-dialog";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/ui/card";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { resetAppSetting, setAppSetting, setNumberSetting } from "./actions";
import { SiteSwitch, type SiteSwitchTexts } from "./site-switch";

/** The settings of the site, one card per category, read from the catalog: a new setting needs only its texts. */
export async function SettingsCards({ canEdit }: { canEdit: boolean }) {
  const t = getAdminTranslations("system.settings");
  const result = await adminApi<AdminAppSettingsResponse>("/system/settings");
  if (!result.ok) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground lg:col-span-2">{t("error")}</p>;
  }
  return APP_SETTING_CATEGORIES.map((category) => (
    <CategoryCard key={category} category={category} settings={result.data.filter(({ key }) => APP_SETTINGS[key].category === category)} canEdit={canEdit} />
  ));
}

function CategoryCard({ category, settings, canEdit }: { category: AppSettingCategory; settings: AdminAppSetting[]; canEdit: boolean }) {
  const t = getAdminTranslations("system.settings.categories");
  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>{t(`${category}.title`)}</CardTitle>
        <CardDescription>{t(`${category}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {settings.map((setting) =>
          APP_SETTINGS[setting.key].rule.type === "boolean" ? (
            <SiteSwitch
              key={setting.key}
              checked={setting.value === true}
              action={setAppSetting.bind(null, setting.key, setting.value !== true)}
              canEdit={canEdit}
              texts={switchTexts(setting.key)}
            />
          ) : (
            <NumberSetting key={setting.key} setting={setting} canEdit={canEdit} />
          ),
        )}
      </CardContent>
    </Card>
  );
}

function switchTexts(key: AdminAppSetting["key"]): SiteSwitchTexts {
  const t = getAdminTranslations("system.settings.items");
  const step = (side: "off" | "on") => ({
    title: t(`${key}.${side}.title` as never),
    description: t(`${key}.${side}.description` as never),
    submit: t(`${key}.${side}.submit` as never),
  });
  return {
    label: t(`${key}.label` as never),
    description: t(`${key}.description` as never),
    off: step("off"),
    on: step("on"),
    cancel: getAdminTranslations("common")("cancel"),
  };
}

/** A number of the catalog, null for no limit: its value, its form, and the way back to the default once changed. */
function NumberSetting({ setting, canEdit }: { setting: AdminAppSetting; canEdit: boolean }) {
  const t = getAdminTranslations("system.settings");
  const item = getAdminTranslations("system.settings.items");
  const { key, value, defaultValue, updatedAt } = setting;
  const rule = APP_SETTINGS[key].rule;
  const shown = (each: unknown) => (typeof each === "number" ? each.toLocaleString("fr-FR") : t("noLimit"));
  const changed = updatedAt !== null && value !== defaultValue;
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <span className="block text-sm font-medium">{item(`${key}.label` as never)}</span>
        <span className="block text-sm text-muted-foreground">{item(`${key}.description` as never)}</span>
        {changed && <span className="mt-1 block text-xs text-muted-foreground">{t("defaultValue", { value: shown(defaultValue) })}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="px-1 text-sm font-semibold tabular-nums">{shown(value)}</span>
        {canEdit && (
          <>
            <FormDialog
              action={setNumberSetting.bind(null, key)}
              quiet
              trigger={{ label: t("edit"), icon: <PencilIcon />, iconOnly: true, variant: "ghost" }}
              title={item(`${key}.form.title` as never)}
              description={item(`${key}.form.description` as never)}
              submitLabel={t("submit")}
              cancelLabel={getAdminTranslations("common")("cancel")}
              fields={[
                {
                  kind: "number",
                  name: "value",
                  label: item(`${key}.form.field` as never),
                  placeholder: item(`${key}.form.placeholder` as never),
                  defaultValue: typeof value === "number" ? value : null,
                  required: rule.type === "number" && rule.required,
                  min: rule.type === "number" ? rule.min : undefined,
                  max: rule.type === "number" ? rule.max : undefined,
                },
              ]}
            />
            {changed && (
              <ActionForm action={resetAppSetting.bind(null, key)} quiet>
                <SubmitButton size="icon-sm" variant="ghost" aria-label={t("reset")} title={t("reset")}>
                  <RotateCcwIcon />
                </SubmitButton>
              </ActionForm>
            )}
          </>
        )}
      </div>
    </div>
  );
}
