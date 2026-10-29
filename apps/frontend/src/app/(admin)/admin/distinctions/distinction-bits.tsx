import "server-only";
import {
  ADMIN_DISTINCTION_DESCRIPTION_MAX_LENGTH,
  ADMIN_DISTINCTION_ID_MAX_LENGTH,
  ADMIN_DISTINCTION_NAME_MAX_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminDistinction,
} from "@kilotrace/shared/admin";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog, type FormField } from "@/components/admin/form-dialog";
import { BADGE_ICON_KEYS, BadgeIcon } from "@/components/distances/badge-icon";
import { Badge } from "@/components/ui/badge";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { createDistinction, deleteDistinction, updateDistinction } from "./actions";

/** Pattern of the slugs, for the browser; the backend checks it again. */
const SLUG_PATTERN = "[a-z0-9]+(_[a-z0-9]+)*";

/** What the permissions of the current member allow on the distinctions. */
export interface DistinctionRights {
  create: boolean;
  edit: boolean;
  delete: boolean;
}

/** Creation of a distinction, or edition of `distinction`. */
export function DistinctionFormDialog({ distinction }: { distinction?: AdminDistinction }) {
  const t = getAdminTranslations("distinctions");
  const f = getAdminTranslations("distinctions.fields");
  const key = distinction ? "edit" : "create";
  const fields: FormField[] = [
    {
      kind: "text",
      name: "id",
      label: f("id"),
      hint: distinction ? undefined : f("idHint"),
      defaultValue: distinction?.id,
      required: true,
      maxLength: ADMIN_DISTINCTION_ID_MAX_LENGTH,
      pattern: SLUG_PATTERN,
      readOnly: Boolean(distinction),
      half: true,
    },
    {
      kind: "text",
      name: "name",
      label: f("name"),
      defaultValue: distinction?.name,
      required: true,
      maxLength: ADMIN_DISTINCTION_NAME_MAX_LENGTH,
      half: true,
    },
    {
      kind: "textarea",
      name: "description",
      label: f("description"),
      hint: f("descriptionHint"),
      defaultValue: distinction?.description ?? undefined,
      maxLength: ADMIN_DISTINCTION_DESCRIPTION_MAX_LENGTH,
    },
    { kind: "color", name: "color", label: f("color"), noneLabel: f("colorNone"), defaultValue: distinction?.color ?? null },
    {
      kind: "icons",
      name: "icon",
      label: f("icon"),
      defaultValue: distinction?.icon ?? BADGE_ICON_KEYS[0],
      options: BADGE_ICON_KEYS.map((value) => ({ value, label: value, icon: <BadgeIcon icon={value} /> })),
    },
  ];
  return (
    <FormDialog
      action={distinction ? updateDistinction.bind(null, distinction.id) : createDistinction}
      trigger={
        distinction
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

/** A distinction: its look as on the profiles, its holders, and the actions the permissions grant. */
export function DistinctionRow({ distinction, rights }: { distinction: AdminDistinction; rights: DistinctionRights }) {
  const t = getAdminTranslations("distinctions");
  const common = getAdminTranslations("common");
  const deletable = rights.delete && !distinction.system;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <BadgeIcon
          icon={distinction.icon}
          className={cn("size-4", !distinction.color && "text-muted-foreground")}
          style={distinction.color ? { color: distinction.color } : undefined}
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{distinction.name}</span>
          <code className="hidden truncate text-xs text-muted-foreground sm:inline">{distinction.id}</code>
          {distinction.system && (
            <Badge variant="secondary" title={t("systemHint")}>
              {t("system")}
            </Badge>
          )}
        </span>
        <span className={cn("truncate text-xs text-muted-foreground", !distinction.description && "italic")}>
          {distinction.description ?? t("noDescription")}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
        {t("holders", { count: distinction.holdersCount })} <UsersIcon className="size-3" aria-hidden />
      </span>
      {(rights.edit || deletable) && (
        <span className="flex shrink-0 items-center gap-1">
          {rights.edit && <DistinctionFormDialog distinction={distinction} />}
          {deletable && (
            <ActionDialog
              action={deleteDistinction.bind(null, distinction.id)}
              trigger={{ label: t("delete.short"), icon: <Trash2Icon />, iconOnly: true }}
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
              confirmation={{ label: common("confirmation", { expected: distinction.id }), expected: distinction.id }}
            />
          )}
        </span>
      )}
    </div>
  );
}
