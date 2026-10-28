import "server-only";
import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminPermission,
  type AdminUserSummary,
  MODERATABLE_FIELDS,
} from "@kilotrace/shared/admin";
import { BanIcon, EraserIcon, LogOutIcon, ShieldCheckIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { ActionDialog, type ActionDialogProps } from "@/components/admin/action-dialog";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { UserActionPermission } from "@/lib/admin/permissions";
import { deleteUser, liftSuspension, moderateUser, revokeSessions, suspendUser, unlinkStrava } from "./actions";

type PresetKey = "moderate" | "suspend" | "revokeSessions" | "unlinkStrava" | "delete";

/** The actions on an account the permissions grant, on a single row, each confirmed in a dialog. */
export function UserActions({ user, permissions }: { user: AdminUserSummary; permissions: readonly AdminPermission[] }) {
  const can = (permission: UserActionPermission) => permissions.includes(permission);
  const t = getAdminTranslations("user.actions");
  const common = getAdminTranslations("common");
  const fields = getAdminTranslations("user.moderatedFields");
  const reason = (key: PresetKey | null, required = true): ActionDialogProps["reason"] => ({
    label: common("reason"),
    placeholder: common("reasonPlaceholder"),
    hint: common("reasonHint", { min: ADMIN_REASON_MIN_LENGTH, max: ADMIN_REASON_MAX_LENGTH }),
    presetsLabel: common("presets"),
    presets: key ? (t.raw(`${key}.presets`) as string[]) : [],
    required,
    min: ADMIN_REASON_MIN_LENGTH,
    max: ADMIN_REASON_MAX_LENGTH,
  });
  const trigger = (key: PresetKey | "lift", icon: React.ReactNode) => ({ label: t(`${key}.short`), icon });
  const shared = { cancelLabel: common("cancel") };

  return (
    <div className="flex flex-wrap gap-1.5">
      {can("users.moderate") && (
      <ActionDialog
        {...shared}
        action={moderateUser.bind(null, user.id)}
        trigger={trigger("moderate", <EraserIcon />)}
        title={t("moderate.title")}
        description={t("moderate.description")}
        submitLabel={t("moderate.submit")}
        choices={{
          name: "fields",
          legend: t("moderate.fields"),
          options: MODERATABLE_FIELDS.map((field) => ({ value: field, label: fields(field) })),
        }}
        reason={reason("moderate")}
      />
      )}
      {can("users.suspend") && (user.suspension ? (
        <ActionDialog
          {...shared}
          action={liftSuspension.bind(null, user.id)}
          trigger={trigger("lift", <ShieldCheckIcon />)}
          title={t("lift.title")}
          description={t("lift.description")}
          submitLabel={t("lift.submit")}
          reason={reason(null, false)}
        />
      ) : (
        <ActionDialog
          {...shared}
          action={suspendUser.bind(null, user.id)}
          trigger={trigger("suspend", <BanIcon />)}
          title={t("suspend.title")}
          description={t("suspend.description")}
          submitLabel={t("suspend.submit")}
          destructive
          duration={{
            label: t("suspend.duration"),
            options: (["7", "1", "30", "indefinite", "custom"] as const).map((value) => ({
              value,
              label: t(`suspend.durations.${value}`),
            })),
            untilLabel: t("suspend.until"),
          }}
          reason={reason("suspend")}
        />
      ))}
      {can("users.sessions") && (
      <ActionDialog
        {...shared}
        action={revokeSessions.bind(null, user.id)}
        trigger={trigger("revokeSessions", <LogOutIcon />)}
        title={t("revokeSessions.title")}
        description={t("revokeSessions.description")}
        submitLabel={t("revokeSessions.submit")}
        reason={reason("revokeSessions", false)}
      />
      )}
      {can("users.strava") && user.stravaConnected && (
        <ActionDialog
          {...shared}
          action={unlinkStrava.bind(null, user.id)}
          trigger={trigger("unlinkStrava", <UnlinkIcon />)}
          title={t("unlinkStrava.title")}
          description={t("unlinkStrava.description")}
          submitLabel={t("unlinkStrava.submit")}
          destructive
          reason={reason("unlinkStrava")}
        />
      )}
      {can("users.delete") && (
      <ActionDialog
          {...shared}
          action={deleteUser.bind(null, user.id)}
          trigger={trigger("delete", <Trash2Icon />)}
          title={t("delete.title")}
          description={t("delete.description")}
          submitLabel={t("delete.submit")}
          destructive
          reason={reason("delete")}
        confirmation={{ label: common("confirmation", { expected: user.username }), expected: user.username }}
      />
      )}
    </div>
  );
}
