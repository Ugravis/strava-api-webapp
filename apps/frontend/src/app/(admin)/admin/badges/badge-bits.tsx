import "server-only";
import {
  ADMIN_BADGE_DESCRIPTION_MAX_LENGTH,
  ADMIN_BADGE_FAMILIES,
  ADMIN_BADGE_ID_MAX_LENGTH,
  ADMIN_BADGE_METRICS,
  ADMIN_BADGE_NAME_MAX_LENGTH,
  ADMIN_BADGE_THEME_ID_MAX_LENGTH,
  ADMIN_BADGE_THEME_NAME_MAX_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminBadge,
  type AdminBadgeTheme,
} from "@kilotrace/shared/admin";
import { EyeIcon, EyeOffIcon, HeartIcon, PencilIcon, PlusIcon, Trash2Icon, UserRoundIcon } from "lucide-react";
import { ActionDialog, type ActionDialogProps } from "@/components/admin/action-dialog";
import { ActionForm } from "@/components/admin/action-form";
import { FormDialog, type FormField } from "@/components/admin/form-dialog";
import { SubmitButton } from "@/components/admin/submit-button";
import { BADGE_ICON_KEYS, BadgeIcon } from "@/components/distances/badge-icon";
import { Badge } from "@/components/ui/badge";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { createBadge, createTheme, deleteBadge, deleteTheme, setBadgeActive, updateBadge, updateTheme } from "./actions";
import { shownAmount } from "./units";

/** Pattern of the slugs, for the browser; the backend checks it again. */
const SLUG_PATTERN = "[a-z0-9]+(_[a-z0-9]+)*";
const amount = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

function reasonFor(presets: string[]): ActionDialogProps["reason"] {
  const common = getAdminTranslations("common");
  return {
    label: common("reason"),
    placeholder: common("reasonPlaceholder"),
    hint: common("reasonHint", { min: ADMIN_REASON_MIN_LENGTH, max: ADMIN_REASON_MAX_LENGTH }),
    presetsLabel: common("presets"),
    presets,
    required: true,
    min: ADMIN_REASON_MIN_LENGTH,
    max: ADMIN_REASON_MAX_LENGTH,
  };
}

/** Creation of a badge, or edition of `badge`, every field in one dialog. */
export function BadgeFormDialog({ badge, themes }: { badge?: AdminBadge; themes: AdminBadgeTheme[] }) {
  const t = getAdminTranslations("badges");
  const f = getAdminTranslations("badges.fields");
  const key = badge ? "edit" : "create";
  const metric = badge?.metric ?? "distance";
  const fields: FormField[] = [
    {
      kind: "text",
      name: "id",
      label: f("id"),
      hint: badge ? undefined : f("idHint"),
      defaultValue: badge?.id,
      required: true,
      maxLength: ADMIN_BADGE_ID_MAX_LENGTH,
      pattern: SLUG_PATTERN,
      readOnly: Boolean(badge),
      half: true,
    },
    { kind: "text", name: "name", label: f("name"), defaultValue: badge?.name, required: true, maxLength: ADMIN_BADGE_NAME_MAX_LENGTH, half: true },
    {
      kind: "textarea",
      name: "description",
      label: f("description"),
      defaultValue: badge?.description,
      required: true,
      maxLength: ADMIN_BADGE_DESCRIPTION_MAX_LENGTH,
    },
    {
      kind: "select",
      name: "metric",
      label: f("metric"),
      defaultValue: metric,
      options: ADMIN_BADGE_METRICS.map((value) => ({ value, label: t(`metrics.${value}`) })),
      half: true,
    },
    {
      kind: "select",
      name: "family",
      label: f("family"),
      defaultValue: badge?.family ?? "all",
      options: ADMIN_BADGE_FAMILIES.map((value) => ({ value, label: t(`families.${value}`) })),
      half: true,
    },
    {
      kind: "number",
      name: "target",
      label: f("target"),
      hint: f("targetHint"),
      defaultValue: badge ? String(shownAmount(metric, badge.target)) : undefined,
      required: true,
      unit: { field: "metric", byValue: Object.fromEntries(ADMIN_BADGE_METRICS.map((value) => [value, t(`units.${value}`)])) },
      half: true,
    },
    {
      kind: "text",
      name: "tiers",
      label: f("tiers"),
      hint: f("tiersHint"),
      defaultValue: badge?.tiers?.map((tier) => String(shownAmount(metric, tier))).join(" "),
      half: true,
    },
    {
      kind: "select",
      name: "themeId",
      label: f("theme"),
      defaultValue: badge?.themeId ?? "",
      options: [{ value: "", label: f("noTheme") }, ...themes.map((theme) => ({ value: theme.id, label: theme.name }))],
      half: true,
    },
    { kind: "color", name: "backgroundColor", label: f("color"), noneLabel: f("colorNone"), defaultValue: badge?.backgroundColor ?? null, half: true },
    {
      kind: "icons",
      name: "icon",
      label: f("icon"),
      defaultValue: badge?.icon ?? BADGE_ICON_KEYS[0],
      options: BADGE_ICON_KEYS.map((value) => ({ value, label: value, icon: <BadgeIcon icon={value} /> })),
    },
  ];
  return (
    <FormDialog
      action={badge ? updateBadge.bind(null, badge.id) : createBadge}
      trigger={
        badge
          ? { label: t("edit.short"), icon: <PencilIcon />, iconOnly: true, variant: "ghost" }
          : { label: t("create.short"), icon: <PlusIcon />, variant: "default" }
      }
      title={t(`${key}.title`)}
      description={t(`${key}.description`)}
      submitLabel={t(`${key}.submit`)}
      cancelLabel={getAdminTranslations("common")("cancel")}
      fields={fields}
    />
  );
}

/** Creation of a collection, or renaming of `theme`. */
export function ThemeFormDialog({ theme }: { theme?: AdminBadgeTheme }) {
  const t = getAdminTranslations("badges.themes");
  const key = theme ? "edit" : "create";
  return (
    <FormDialog
      action={theme ? updateTheme.bind(null, theme.id) : createTheme}
      trigger={
        theme
          ? { label: t("edit.short"), icon: <PencilIcon />, iconOnly: true, variant: "ghost" }
          : { label: t("create.short"), icon: <PlusIcon /> }
      }
      title={t(`${key}.title`)}
      description={t(`${key}.description`)}
      submitLabel={t(`${key}.submit`)}
      cancelLabel={getAdminTranslations("common")("cancel")}
      fields={[
        {
          kind: "text",
          name: "id",
          label: t("fields.id"),
          hint: theme ? undefined : t("fields.idHint"),
          defaultValue: theme?.id,
          required: true,
          maxLength: ADMIN_BADGE_THEME_ID_MAX_LENGTH,
          pattern: SLUG_PATTERN,
          readOnly: Boolean(theme),
          half: true,
        },
        { kind: "text", name: "name", label: t("fields.name"), defaultValue: theme?.name, required: true, maxLength: ADMIN_BADGE_THEME_NAME_MAX_LENGTH, half: true },
      ]}
    />
  );
}

/** A collection: its name, its badges, and its actions for the admins. */
export function ThemeRow({ theme, count, canEdit }: { theme: AdminBadgeTheme; count: number; canEdit: boolean }) {
  const t = getAdminTranslations("badges.themes");
  return (
    <div className="flex min-h-9 items-center gap-2 py-0.5">
      <span className="truncate text-sm font-medium">{theme.name}</span>
      <code className="truncate text-xs text-muted-foreground">{theme.id}</code>
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{t("badges", { count })}</span>
      {canEdit && (
        <span className="flex shrink-0 items-center gap-1">
          <ThemeFormDialog theme={theme} />
          <ActionDialog
            action={deleteTheme.bind(null, theme.id)}
            trigger={{ label: t("delete.short"), icon: <Trash2Icon />, iconOnly: true }}
            title={t("delete.title")}
            description={t("delete.description")}
            submitLabel={t("delete.submit")}
            cancelLabel={getAdminTranslations("common")("cancel")}
            destructive
            reason={reasonFor(t.raw("delete.presets") as string[])}
          />
        </span>
      )}
    </div>
  );
}

/** A badge: its look, what it counts, how many users picked it, and its actions for the admins. */
export function BadgeRow({ badge, themes, canEdit }: { badge: AdminBadge; themes: AdminBadgeTheme[]; canEdit: boolean }) {
  const t = getAdminTranslations("badges");
  const common = getAdminTranslations("common");
  const unit = t(`units.${badge.metric}`);
  const amounts = badge.tiers
    ? t("tiers", { tiers: badge.tiers.map((tier) => amount.format(shownAmount(badge.metric, tier))).join(" · ") })
    : amount.format(shownAmount(badge.metric, badge.target));
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card px-3 py-2", !badge.active && "bg-muted/50")}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground",
          !badge.active && "opacity-50",
        )}
        style={badge.backgroundColor ? { backgroundColor: badge.backgroundColor, color: textOn(badge.backgroundColor) } : undefined}
      >
        <BadgeIcon icon={badge.icon} className="size-4" aria-hidden />
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col", !badge.active && "opacity-60")}>
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{badge.name}</span>
          <code className="hidden truncate text-xs text-muted-foreground sm:inline">{badge.id}</code>
          {!badge.active && <Badge variant="secondary">{t("inactive")}</Badge>}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {t(`metrics.${badge.metric}`)} • {t(`families.${badge.family}`)} • {amounts} {unit}
        </span>
      </span>
      <span className="hidden shrink-0 flex-col items-end text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1">
          {t("favorites", { count: badge.favoritesCount })} <HeartIcon className="size-3" aria-hidden />
        </span>
        <span className="flex items-center gap-1">
          {t("profiles", { count: badge.profilesCount })} <UserRoundIcon className="size-3" aria-hidden />
        </span>
      </span>
      {canEdit && (
        <span className="flex shrink-0 items-center gap-1">
          <ActionForm action={setBadgeActive.bind(null, badge.id, !badge.active)}>
            <SubmitButton
              size="icon-sm"
              variant="ghost"
              aria-label={t(badge.active ? "deactivate" : "activate")}
              title={t(badge.active ? "deactivate" : "activate")}
            >
              {badge.active ? <EyeOffIcon /> : <EyeIcon />}
            </SubmitButton>
          </ActionForm>
          <BadgeFormDialog badge={badge} themes={themes} />
          <ActionDialog
            action={deleteBadge.bind(null, badge.id)}
            trigger={{ label: t("delete.short"), icon: <Trash2Icon />, iconOnly: true }}
            title={t("delete.title")}
            description={t("delete.description")}
            submitLabel={t("delete.submit")}
            cancelLabel={common("cancel")}
            destructive
            reason={reasonFor(t.raw("delete.presets") as string[])}
            confirmation={{ label: common("confirmation", { expected: badge.id }), expected: badge.id }}
          />
        </span>
      )}
    </div>
  );
}

/** Black or white, whichever reads better on the color. */
function textOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#000" : "#fff";
}
