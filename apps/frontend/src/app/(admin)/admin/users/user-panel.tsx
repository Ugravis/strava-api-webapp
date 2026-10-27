import "server-only";
import {
  ADMIN_DISTINCTION_KINDS,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  ADMIN_ROLES,
  AdminRole,
  type AdminPage,
  type AdminUserDetail,
  type AuditLogEntry,
  hasAdminRole,
  highestAdminRole,
  MODERATABLE_FIELDS,
} from "@kilotrace/shared/admin";
import { BanIcon, EraserIcon, LogOutIcon, ShieldCheckIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionDialog, type ActionDialogProps } from "@/components/admin/action-dialog";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { getAdminMe } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { countryName } from "@/lib/countries/country-format";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { AuditEntryItem } from "../audit-log/audit-entry";
import {
  deleteUser,
  liftSuspension,
  moderateUser,
  revokeSessions,
  setDistinction,
  suspendUser,
  unlinkStrava,
} from "./actions";
import { UserBadges } from "./user-badges";

const HISTORY_SIZE = 5;

/** Rank of the highest back-office role, -1 without any, as the backend compares them. */
function rankOf(roles: readonly string[]): number {
  const role = highestAdminRole(roles);
  return role ? ADMIN_ROLES.indexOf(role) : -1;
}

/** Everything the back office shows of an account, and the actions the role grants on it. */
export async function UserPanel({ id }: { id: string }) {
  const t = getAdminTranslations("user");
  const [me, result] = await Promise.all([getAdminMe(), adminApi<AdminUserDetail>(`/users/${encodeURIComponent(id)}`)]);
  if (!result.ok || !me) {
    return (
      <SheetHeader>
        <SheetTitle>{t("title")}</SheetTitle>
        <SheetDescription>{t("notFound")}</SheetDescription>
      </SheetHeader>
    );
  }
  const user = result.data;
  const isAdmin = hasAdminRole(me.roles, AdminRole.Admin);
  // The backend refuses the same cases; the buttons are not offered.
  const restriction = !isAdmin
    ? t("readOnly")
    : user.id === me.id
      ? t("self")
      : rankOf(user.roles) >= rankOf(me.roles)
        ? t("protected")
        : null;

  return (
    <>
      <SheetHeader className="flex-row items-center gap-3 border-b pr-12">
        <UserAvatar user={user} className="size-14" />
        <div className="flex min-w-0 flex-col gap-1">
          <SheetTitle className="truncate text-base">{publicNameOf(user)}</SheetTitle>
          <SheetDescription className="truncate">@{user.username}</SheetDescription>
          <UserBadges user={user} />
        </div>
      </SheetHeader>

      <div className="flex flex-col divide-y">
        {user.suspension && (
          <Section title={t("sections.suspension")} className="bg-destructive/5">
            <Field label={t("fields.suspendedSince")}>{formatDateTime(user.suspension.since)}</Field>
            <Field label={t("fields.suspendedUntil")}>
              {user.suspension.until ? formatDateTime(user.suspension.until) : t("fields.indefinite")}
            </Field>
            <Field label={t("fields.suspensionReason")}>{user.suspension.reason}</Field>
          </Section>
        )}

        <Section title={t("sections.actions")}>
          {restriction ? (
            <p className="text-sm text-muted-foreground">{restriction}</p>
          ) : (
            <UserActions user={user} />
          )}
        </Section>

        <Section title={t("sections.account")}>
          <Field label={t("fields.email")}>{user.email}</Field>
          <Field label={t("fields.id")}>
            <code className="text-xs break-all">{user.id}</code>
          </Field>
          <Field label={t("fields.createdAt")}>{formatDateTime(user.createdAt)}</Field>
          <Field label={t("fields.lastSeenAt")}>{user.lastSeenAt ? formatDateTime(user.lastSeenAt) : getAdminTranslations("common")("never")}</Field>
          <Field label={t("fields.signIn")}>{user.signInMethods.map((method) => t(`signIn.${method}`)).join(", ")}</Field>
          <Field label={t("fields.sessions")}>{user.sessionsCount}</Field>
        </Section>

        <Section title={t("sections.profile")}>
          <Field label={t("fields.displayName")}>{user.displayName}</Field>
          <Field label={t("fields.bio")}>{user.bio}</Field>
          <Field label={t("fields.city")}>{user.city}</Field>
          <Field label={t("fields.country")}>{user.countryCode && countryName(user.countryCode, "fr")}</Field>
          <Field label={t("fields.visibility")}>
            {getAdminTranslations("users.badges")(user.profilePrivate ? "private" : "public")}
          </Field>
        </Section>

        <Section title={t("sections.strava")}>
          {user.strava ? (
            <>
              <Field label={t("fields.stravaAccount")}>{user.strava.accountName}</Field>
              <Field label={t("fields.stravaConnectedAt")}>{formatDateTime(user.strava.connectedAt)}</Field>
              <Field label={t("fields.stravaLastSync")}>{user.strava.lastSyncedAt && formatDateTime(user.strava.lastSyncedAt)}</Field>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("stravaNone")}</p>
          )}
          <Field label={t("fields.activities")}>{user.activitiesCount}</Field>
        </Section>

        <Section title={t("sections.community")}>
          <Field label={t("fields.followers")}>{user.followersCount}</Field>
          <Field label={t("fields.following")}>{user.followingCount}</Field>
        </Section>

        <Section title={t("sections.distinctions")}>
          <ul className="flex flex-col gap-2">
            {ADMIN_DISTINCTION_KINDS.map((kind) => {
              const distinction = user.distinctions.find((each) => each.kind === kind);
              return (
                <li key={kind} className="flex items-center justify-between gap-3">
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{t(`distinctions.${kind}`)}</span>
                    {distinction && (
                      <span className="text-xs text-muted-foreground">
                        {t("distinctions.granted", { date: formatDate(distinction.awardedAt) })}
                      </span>
                    )}
                  </span>
                  {isAdmin && (
                    <ActionForm action={setDistinction.bind(null, user.id, kind, !distinction)}>
                      <SubmitButton size="sm" variant={distinction ? "outline" : "secondary"}>
                        {t(distinction ? "distinctions.revoke" : "distinctions.grant")}
                      </SubmitButton>
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        {isAdmin && <UserHistory id={user.id} />}
      </div>
    </>
  );
}

/** The actions on another account, each confirmed in a dialog. */
function UserActions({ user }: { user: AdminUserDetail }) {
  const t = getAdminTranslations("user.actions");
  const common = getAdminTranslations("common");
  const fields = getAdminTranslations("user.moderatedFields");
  const reason = (presets: string[], required = true): ActionDialogProps["reason"] => ({
    label: common("reason"),
    placeholder: common("reasonPlaceholder"),
    hint: common("reasonHint", { min: ADMIN_REASON_MIN_LENGTH, max: ADMIN_REASON_MAX_LENGTH }),
    presetsLabel: common("presets"),
    presets,
    required,
    min: ADMIN_REASON_MIN_LENGTH,
    max: ADMIN_REASON_MAX_LENGTH,
  });
  const presets = (key: "moderate" | "suspend" | "unlinkStrava" | "delete") => t.raw(`${key}.presets`) as string[];
  const shared = { cancelLabel: common("cancel") };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <ActionDialog
        {...shared}
        action={moderateUser.bind(null, user.id)}
        trigger={{ label: t("moderate.trigger"), icon: <EraserIcon /> }}
        title={t("moderate.title")}
        description={t("moderate.description")}
        submitLabel={t("moderate.submit")}
        choices={{
          name: "fields",
          legend: t("moderate.fields"),
          options: MODERATABLE_FIELDS.map((field) => ({ value: field, label: fields(field) })),
        }}
        reason={reason(presets("moderate"))}
      />
      {user.suspension ? (
        <ActionDialog
          {...shared}
          action={liftSuspension.bind(null, user.id)}
          trigger={{ label: t("lift.trigger"), icon: <ShieldCheckIcon /> }}
          title={t("lift.title")}
          description={t("lift.description")}
          submitLabel={t("lift.submit")}
          reason={reason([], false)}
        />
      ) : (
        <ActionDialog
          {...shared}
          action={suspendUser.bind(null, user.id)}
          trigger={{ label: t("suspend.trigger"), icon: <BanIcon /> }}
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
          reason={reason(presets("suspend"))}
        />
      )}
      <ActionDialog
        {...shared}
        action={revokeSessions.bind(null, user.id)}
        trigger={{ label: t("revokeSessions.trigger"), icon: <LogOutIcon /> }}
        title={t("revokeSessions.title")}
        description={t("revokeSessions.description")}
        submitLabel={t("revokeSessions.submit")}
        reason={reason([], false)}
      />
      {user.strava && (
        <ActionDialog
          {...shared}
          action={unlinkStrava.bind(null, user.id)}
          trigger={{ label: t("unlinkStrava.trigger"), icon: <UnlinkIcon /> }}
          title={t("unlinkStrava.title")}
          description={t("unlinkStrava.description")}
          submitLabel={t("unlinkStrava.submit")}
          destructive
          reason={reason(presets("unlinkStrava"))}
        />
      )}
      <ActionDialog
        {...shared}
        action={deleteUser.bind(null, user.id)}
        trigger={{ label: t("delete.trigger"), icon: <Trash2Icon /> }}
        title={t("delete.title")}
        description={t("delete.description")}
        submitLabel={t("delete.submit")}
        destructive
        reason={reason(presets("delete"))}
        confirmation={{ label: common("confirmation", { expected: user.username }), expected: user.username }}
      />
    </div>
  );
}

/** The latest entries of the audit log about the account. */
async function UserHistory({ id }: { id: string }) {
  const t = getAdminTranslations("user");
  const result = await adminApi<AdminPage<AuditLogEntry>>(`/audit-log?target=${encodeURIComponent(id)}`);
  const entries = result.ok ? result.data.items.slice(0, HISTORY_SIZE) : [];
  return (
    <Section title={t("sections.history")}>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <AuditEntryItem key={entry.id} entry={entry} compact />
          ))}
        </ul>
      )}
      {result.ok && result.data.total > 0 && (
        <Link href={`${adminRoutes.auditLog}?target=${id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          {t("historyAll")}
        </Link>
      )}
    </Section>
  );
}

function Section({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-2 p-4", className)}>
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** A label over its value; an empty value shows a dash. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={empty ? "text-muted-foreground" : "min-w-0 break-words"}>{empty ? "—" : children}</span>
    </div>
  );
}

export function UserPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-busy>
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}
