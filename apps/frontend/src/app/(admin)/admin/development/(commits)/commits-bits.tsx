import type { AdminCommit, AdminCommitsResponse } from "@kilotrace/shared/admin";
import { GitCommitHorizontalIcon, GitMergeIcon, type LucideIcon } from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin/api";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";

const hrefFor = (page: number) => (page > 1 ? `${adminRoutes.development}?page=${page}` : adminRoutes.development);

/** A page of the commits of `main`, merges on `main` as bands, the deployed one marked. */
export async function CommitsList({ page }: { page: number }) {
  const t = getAdminTranslations("commits");
  const common = getAdminTranslations("common");
  const result = await adminApi<AdminCommitsResponse>(`/dev/commits?page=${page}`);

  if (!result.ok || result.data.status !== "ok") {
    const message =
      result.ok && result.data.status === "unconfigured"
        ? t("unconfigured")
        : t("unavailable", { repository: result.ok && result.data.status === "unavailable" ? result.data.repository : "GitHub" });
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{message}</p>;
  }

  const { commits, deployed, undeployed, pages } = result.data;
  const pagination = (
    <Pagination
      page={page}
      pages={pages}
      hrefFor={hrefFor}
      labels={{
        navigation: common("pagination"),
        previous: common("previous"),
        next: common("next"),
        status: common("page", { page, pages }),
      }}
    />
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {!deployed ? t("noDeployed") : undeployed === 0 ? t("upToDate") : undeployed !== null && t("undeployed", { count: undeployed })}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        {pagination}
      </div>
      {commits.length > 0 ? (
        <ol className="overflow-hidden rounded-xl border">
          {commits.map((commit) => (
            <CommitRow key={commit.sha} commit={commit} deployed={!!deployed && commit.sha.startsWith(deployed)} />
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {pagination}
    </div>
  );
}

function Legend() {
  const t = getAdminTranslations("commits.legend");
  const items: [LucideIcon, string, string][] = [
    [GitMergeIcon, t("mainMerge"), "size-4 rounded-sm bg-primary p-0.5 text-primary-foreground"],
    [GitMergeIcon, t("merge"), "size-4 text-muted-foreground"],
    [GitCommitHorizontalIcon, t("commit"), "size-4 text-muted-foreground"],
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([Icon, label, className]) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon className={className} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

function CommitRow({ commit, deployed }: { commit: AdminCommit; deployed: boolean }) {
  const t = getAdminTranslations("commits");
  const Icon = commit.merge ? GitMergeIcon : GitCommitHorizontalIcon;
  const band = commit.mainMerge;
  return (
    <li
      className={cn(
        "flex items-start gap-3 border-t px-3 text-sm first:border-t-0",
        // Merges on `main` stand out as bands, splitting the history in deliveries.
        band ? "bg-primary py-3 text-primary-foreground" : "py-2",
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", !band && "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 flex-1">
        <a
          href={commit.url}
          target="_blank"
          rel="noreferrer"
          className={cn("block truncate underline-offset-4 hover:underline", band && "font-semibold")}
          title={commit.title}
        >
          {commit.title}
        </a>
        <p className={cn("text-xs", band ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {commit.pullRequest !== null && <span className={cn("font-medium", !band && "text-foreground")}>#{commit.pullRequest} · </span>}
          {commit.author} · <span title={formatDateTime(commit.date)}>{formatRelative(commit.date)}</span>
        </p>
      </div>
      {deployed && <Badge variant={band ? "secondary" : "default"}>{t("deployed")}</Badge>}
      <code className={cn("shrink-0 font-mono text-xs", band ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {commit.sha.slice(0, 7)}
      </code>
    </li>
  );
}

export function CommitsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-[40rem] w-full rounded-xl" />
    </div>
  );
}
