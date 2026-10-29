import "server-only";
import {
  ADMIN_USER_TAG_DESCRIPTION_MAX_LENGTH,
  ADMIN_USER_TAG_ID_MAX_LENGTH,
  ADMIN_USER_TAG_NAME_MAX_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminUserTag,
} from "@kilotrace/shared/admin";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog, type FormField } from "@/components/admin/form-dialog";
import { BADGE_ICON_KEYS, BadgeIcon } from "@/components/distances/badge-icon";
import { Badge } from "@/components/ui/badge";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { createUserTag, deleteUserTag, updateUserTag } from "./actions";

/** Pattern of the slugs, for the browser; the backend checks it again. */
const SLUG_PATTERN = "[a-z0-9]+(_[a-z0-9]+)*";

/** What the permissions of the current member allow on the user tags. */
export interface UserTagRights {
  create: boolean;
  edit: boolean;
  delete: boolean;
}

/** Creation of a user tag, or edition of `userTag`. */
export function UserTagFormDialog({ userTag }: { userTag?: AdminUserTag }) {
  const t = getAdminTranslations("userTags");
  const f = getAdminTranslations("userTags.fields");
  const key = userTag ? "edit" : "create";
  const fields: FormField[] = [
    {
      kind: "text",
      name: "id",
      label: f("id"),
      hint: userTag ? undefined : f("idHint"),
      defaultValue: userTag?.id,
      required: true,
      maxLength: ADMIN_USER_TAG_ID_MAX_LENGTH,
      pattern: SLUG_PATTERN,
      readOnly: Boolean(userTag),
      half: true,
    },
    {
      kind: "text",
      name: "name",
      label: f("name"),
      defaultValue: userTag?.name,
      required: true,
      maxLength: ADMIN_USER_TAG_NAME_MAX_LENGTH,
      half: true,
    },
    {
      kind: "textarea",
      name: "description",
      label: f("description"),
      hint: f("descriptionHint"),
      defaultValue: userTag?.description ?? undefined,
      maxLength: ADMIN_USER_TAG_DESCRIPTION_MAX_LENGTH,
    },
    { kind: "color", name: "color", label: f("color"), noneLabel: f("colorNone"), defaultValue: userTag?.color ?? null },
    {
      kind: "icons",
      name: "icon",
      label: f("icon"),
      defaultValue: userTag?.icon ?? BADGE_ICON_KEYS[0],
      options: BADGE_ICON_KEYS.map((value) => ({ value, label: value, icon: <BadgeIcon icon={value} /> })),
    },
  ];
  return (
    <FormDialog
      action={userTag ? updateUserTag.bind(null, userTag.id) : createUserTag}
      trigger={
        userTag
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

/** A user tag: its look as on the profiles, its holders, and the actions the permissions grant. */
export function UserTagRow({ userTag, rights }: { userTag: AdminUserTag; rights: UserTagRights }) {
  const t = getAdminTranslations("userTags");
  const common = getAdminTranslations("common");
  const deletable = rights.delete && !userTag.system;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <BadgeIcon
          icon={userTag.icon}
          className={cn("size-4", !userTag.color && "text-muted-foreground")}
          style={userTag.color ? { color: userTag.color } : undefined}
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{userTag.name}</span>
          <code className="hidden truncate text-xs text-muted-foreground sm:inline">{userTag.id}</code>
          {userTag.system && (
            <Badge variant="secondary" title={t("systemHint")}>
              {t("system")}
            </Badge>
          )}
        </span>
        <span className={cn("truncate text-xs text-muted-foreground", !userTag.description && "italic")}>
          {userTag.description ?? t("noDescription")}
        </span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
        {t("holders", { count: userTag.holdersCount })} <UsersIcon className="size-3" aria-hidden />
      </span>
      {(rights.edit || deletable) && (
        <span className="flex shrink-0 items-center gap-1">
          {rights.edit && <UserTagFormDialog userTag={userTag} />}
          {deletable && (
            <ActionDialog
              action={deleteUserTag.bind(null, userTag.id)}
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
              confirmation={{ label: common("confirmation", { expected: userTag.id }), expected: userTag.id }}
            />
          )}
        </span>
      )}
    </div>
  );
}
