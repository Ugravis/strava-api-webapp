import "server-only";
import type { AuditLogEntry, AuditUser } from "@kilotrace/shared/admin";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { setEntryHidden } from "./actions";

/**
 * An entry of the audit log, as a sentence: who did what to whom, why, and
 * how it went. `masking` offers the super-admins to mask it or show it again.
 */
export function AuditEntryItem({ entry, compact, masking }: { entry: AuditLogEntry; compact?: boolean; masking?: boolean }) {
  const t = getAdminTranslations("auditLog");
  const actions = getAdminTranslations("auditLog.actions");
  const key = entry.action as Parameters<typeof actions>[0];
  const verb = actions.has(key) ? actions(key) : entry.action;
  const hidden = Boolean(entry.hiddenAt);

  return (
    <li className={cn("flex gap-3", !compact && "rounded-xl border bg-card p-3", hidden && "opacity-70")}>
      {!compact &&
        (entry.actor ? (
          <UserAvatar user={named(entry.actor, t("deleted"))} className="size-8" />
        ) : (
          <span className="size-8 shrink-0 rounded-full bg-muted" aria-hidden />
        ))}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm leading-snug">
          <UserName user={entry.actor} fallback={t("system")} deleted={t("deleted")} /> {verb}
          {entry.targetUser && (
            <>
              {" "}
              <UserName user={entry.targetUser} fallback="" deleted={t("deleted")} />
            </>
          )}
        </p>
        {entry.reason && <p className="text-sm whitespace-pre-line text-muted-foreground">« {entry.reason} »</p>}
        <Details entry={entry} />
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
          {!entry.succeeded && <Badge variant="destructive">{t("failed", { status: entry.status ?? "—" })}</Badge>}
          {hidden && (
            <Badge variant="outline">
              <EyeOffIcon />
              {t("hidden")}
            </Badge>
          )}
        </div>
      </div>
      {masking && (
        <ActionForm action={setEntryHidden.bind(null, entry.id, !hidden)} className="shrink-0">
          <SubmitButton size="sm" variant="ghost" title={hidden ? undefined : t("hideHint")}>
            {hidden ? <EyeIcon /> : <EyeOffIcon />}
            <span className="max-sm:sr-only">{t(hidden ? "show" : "hide")}</span>
          </SubmitButton>
        </ActionForm>
      )}
    </li>
  );
}

/** A user of an entry, linked to their panel while the account exists. */
function UserName({ user, fallback, deleted }: { user: AuditUser | null; fallback: string; deleted: string }) {
  if (!user) {
    return <span className="font-medium">{fallback}</span>;
  }
  if (!user.username) {
    return <span className="font-medium text-muted-foreground italic">{deleted}</span>;
  }
  return (
    <Link href={`${adminRoutes.users}?user=${user.id}`} className="font-medium underline-offset-2 hover:underline">
      {publicNameOf(named(user, deleted))}
    </Link>
  );
}

/** Parameters of the action recorded with it, in words. */
function Details({ entry }: { entry: AuditLogEntry }) {
  const t = getAdminTranslations("auditLog.details");
  const fields = getAdminTranslations("user.moderatedFields");
  const kinds = getAdminTranslations("user.distinctions");
  const { until, fields: reset, kind } = entry.details ?? {};
  const lines = [
    typeof until === "string" && t("until", { date: formatDateTime(until) }),
    Array.isArray(reset) &&
      t("fields", {
        fields: reset.map((field) => (fields.has(field as never) ? fields(field as never) : String(field))).join(", "),
      }),
    typeof kind === "string" && t("kind", { kind: kinds.has(kind as never) ? kinds(kind as never) : kind }),
  ].filter(Boolean);
  if (lines.length === 0) {
    return null;
  }
  return <p className="text-xs text-muted-foreground">{lines.join(" · ")}</p>;
}

/** A user with a username, for the avatar and the name helpers. */
function named(user: AuditUser, deleted: string) {
  return { ...user, username: user.username ?? deleted };
}
