import "server-only";
import {
  type AdminDistinction,
  type AdminPage,
  type AdminPermission,
  type AdminUserDetail,
  type AuditLogEntry,
} from "@kilotrace/shared/admin";
import { PencilLineIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { getAdminMe } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDate, formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { actRefusal } from "@/lib/admin/permissions";
import { countryName } from "@/lib/countries/country-format";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { setDistinction } from "./actions";
import { UserActions } from "./user-actions";
import { ConnectionIcons, DistinctionIcon, RoleBadge, SuspendedMark } from "./user-bits";

const HISTORY_SIZE = 5;

/** Everything the back office shows of an account, and the actions the role grants on it. */
export async function UserPanel({ id }: { id: string }) {
  const t = getAdminTranslations("user");
  const [me, result, catalog] = await Promise.all([
    getAdminMe(),
    adminApi<AdminUserDetail>(`/users/${encodeURIComponent(id)}`),
    adminApi<AdminDistinction[]>("/distinctions"),
  ]);
  if (!result.ok || !me) {
    return <p className="p-4 text-sm text-muted-foreground">{t("notFound")}</p>;
  }
  const user = result.data;
  const refusal = actRefusal(me, user);
  const can = (permission: AdminPermission) => me.permissions.includes(permission);
  const never = getAdminTranslations("common")("never");

  return (
    <div className="flex flex-col divide-y">
      <header className="flex items-center gap-3 p-4">
        <UserAvatar user={user} className="size-12" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="flex items-center gap-2 font-semibold">
            <span className="truncate">{publicNameOf(user)}</span>
            <RoleBadge roles={user.roles} />
            {user.suspension && <SuspendedMark />}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            @{user.username} • {formatDate(user.createdAt)}
          </p>
        </div>
      </header>

      <Section title={t("sections.actions")}>
        {refusal ? <p className="text-sm text-muted-foreground">{t(refusal)}</p> : <UserActions user={user} permissions={me.permissions} />}
      </Section>

      {user.suspension && (
        <Section title={t("sections.suspension")} className="bg-destructive/5">
          <Field label={t("fields.suspendedSince")}>{formatDateTime(user.suspension.since)}</Field>
          <Field label={t("fields.suspendedUntil")}>
            {user.suspension.until ? formatDateTime(user.suspension.until) : t("fields.indefinite")}
          </Field>
          <Field label={t("fields.suspensionReason")}>{user.suspension.reason}</Field>
        </Section>
      )}

      {/* The only free texts of the account: set apart, as what moderation is about. */}
      <Section
        title={t("sections.profile")}
        className="border-l-4 border-l-amber-400 bg-amber-500/5"
        aside={
          <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <PencilLineIcon className="size-3.5" aria-hidden />
            {t("profileHint")}
          </span>
        }
      >
        <Field label={t("fields.displayName")}>{user.displayName}</Field>
        <Field label={t("fields.username")}>@{user.username}</Field>
        <Field label={t("fields.bio")}>{user.bio && <span className="whitespace-pre-line">{user.bio}</span>}</Field>
        <Field label={t("fields.city")}>{user.city}</Field>
        <Field label={t("fields.country")}>{user.countryCode && countryName(user.countryCode, "fr")}</Field>
        <Field label={t("fields.visibility")}>
          {getAdminTranslations("users.badges")(user.profilePrivate ? "private" : "public")}
        </Field>
      </Section>

      <Section title={t("sections.account")}>
        <Field label={t("fields.email")}>{user.email}</Field>
        <Field label={t("fields.id")}>
          <code className="text-xs break-all">{user.id}</code>
        </Field>
        <Field label={t("fields.createdAt")}>{formatDateTime(user.createdAt)}</Field>
        <Field label={t("fields.lastSeenAt")}>
          {user.lastSeenAt ? <time dateTime={user.lastSeenAt} title={formatDateTime(user.lastSeenAt)}>{formatRelative(user.lastSeenAt)}</time> : never}
        </Field>
        <Field label={t("fields.sessions")}>{user.sessionsCount}</Field>
      </Section>

      <Section title={t("sections.connections")}>
        <Field label={t("fields.signIn")}>
          <ConnectionIcons user={user} />
        </Field>
        {user.strava ? (
          <>
            <Field label={t("fields.stravaAccount")}>{user.strava.accountName}</Field>
            <Field label={t("fields.stravaConnectedAt")}>{formatDateTime(user.strava.connectedAt)}</Field>
            <Field label={t("fields.stravaLastSync")}>
              {user.strava.lastSyncedAt && formatRelative(user.strava.lastSyncedAt)}
            </Field>
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
          {(catalog.ok ? catalog.data : user.distinctions).map((distinction) => {
            const held = user.distinctions.find((each) => each.id === distinction.id);
            return (
              <li key={distinction.id} className="flex items-center gap-3">
                <DistinctionIcon distinction={distinction} />
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{distinction.name}</span>
                  {held && (
                    <span className="text-xs text-muted-foreground">
                      {t("distinctions.granted", { date: formatDate(held.awardedAt) })}
                    </span>
                  )}
                </span>
                {can("users.distinctions") && (
                  <ActionForm action={setDistinction.bind(null, user.id, distinction.id, !held)}>
                    <SubmitButton size="xs" variant={held ? "outline" : "secondary"}>
                      {t(held ? "distinctions.revoke" : "distinctions.grant")}
                    </SubmitButton>
                  </ActionForm>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <UserHistory id={user.id} />
    </div>
  );
}

/** The latest entries of the logs about the account. */
async function UserHistory({ id }: { id: string }) {
  const t = getAdminTranslations("user");
  const actions = getAdminTranslations("auditLog.actions");
  const result = await adminApi<AdminPage<AuditLogEntry>>(`/audit-log?target=${encodeURIComponent(id)}`);
  const entries = result.ok ? result.data.items.slice(0, HISTORY_SIZE) : [];
  return (
    <Section title={t("sections.history")}>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const key = entry.action as Parameters<typeof actions>[0];
            return (
              <li key={entry.id} className="flex flex-col text-sm">
                <span>
                  <span className="font-medium">{actions.has(key) ? actions(key) : entry.action}</span>{" "}
                  {entry.actor && (
                    <span className="text-muted-foreground">
                      {t("historyBy", { name: entry.actor.displayName ?? entry.actor.username ?? "—" })}
                    </span>
                  )}
                </span>
                {entry.reason && <span className="text-xs text-muted-foreground">« {entry.reason} »</span>}
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
              </li>
            );
          })}
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

function Section({
  title,
  aside,
  className,
  children,
}: {
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-2 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A label beside its value; an empty value shows a dash. */
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
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-7 w-full" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}
