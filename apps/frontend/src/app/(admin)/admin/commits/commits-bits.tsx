import type { AdminCommit, AdminCommitsResponse } from "@kilotrace/shared/admin";
import { GitCommitHorizontalIcon, GitMergeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin/api";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";

/** Latest commits of `main` from GitHub, merges highlighted, the deployed one marked. */
export async function CommitsList() {
  const t = getAdminTranslations("dev.commits");
  const result = await adminApi<AdminCommitsResponse>("/dev/commits");

  if (!result.ok || result.data.status !== "ok") {
    const message =
      result.ok && result.data.status === "unconfigured"
        ? t("unconfigured")
        : t("unavailable", { repository: result.ok && result.data.status === "unavailable" ? result.data.repository : "GitHub" });
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{message}</p>;
  }

  const { commits, undeployed, deployed } = result.data;
  return (
    <div className="flex flex-col gap-3">
      {undeployed !== null && (
        <p className="text-sm text-muted-foreground">
          {undeployed === 0 ? t("upToDate") : t("undeployed", { count: undeployed })}
        </p>
      )}
      <ol className="overflow-hidden rounded-xl border">
        {commits.map((commit) => (
          <CommitRow key={commit.sha} commit={commit} deployed={!!deployed && commit.sha.startsWith(deployed)} />
        ))}
      </ol>
    </div>
  );
}

function CommitRow({ commit, deployed }: { commit: AdminCommit; deployed: boolean }) {
  const t = getAdminTranslations("dev.commits");
  const Icon = commit.merge ? GitMergeIcon : GitCommitHorizontalIcon;
  return (
    <li
      className={cn(
        "flex items-start gap-3 border-t px-3 py-2 text-sm first:border-t-0",
        commit.merge && "bg-muted",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", commit.merge ? "text-primary" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 flex-1">
        <a
          href={commit.url}
          target="_blank"
          rel="noreferrer"
          className={cn("block truncate underline-offset-4 hover:underline", commit.merge && "font-medium")}
          title={commit.title}
        >
          {commit.title}
        </a>
        <p className="text-xs text-muted-foreground">
          {commit.pullRequest !== null && <span className="font-medium text-foreground">#{commit.pullRequest} · </span>}
          {commit.author} · <span title={formatDateTime(commit.date)}>{formatRelative(commit.date)}</span>
        </p>
      </div>
      {deployed && <Badge>{t("deployed")}</Badge>}
      <code className="shrink-0 font-mono text-xs text-muted-foreground">{commit.sha.slice(0, 7)}</code>
    </li>
  );
}

export function CommitsSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />;
}
