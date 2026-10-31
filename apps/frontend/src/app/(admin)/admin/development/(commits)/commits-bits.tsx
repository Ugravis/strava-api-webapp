import type { AdminCommitsResponse } from "@kilotrace/shared/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { CommitsTable } from "./commits-table";

/** Where production stands against `main`, then its commits, the deployed one marked. */
export async function CommitsList() {
  const t = getAdminTranslations("commits");
  const result = await adminApi<AdminCommitsResponse>("/dev/commits");

  if (!result.ok || result.data.status !== "ok") {
    const message =
      result.ok && result.data.status === "unconfigured"
        ? t("unconfigured")
        : t("unavailable", { repository: result.ok && result.data.status === "unavailable" ? result.data.repository : "GitHub" });
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{message}</p>;
  }

  const { deployed, undeployed } = result.data;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {!deployed ? t("noDeployed") : undeployed === 0 ? t("upToDate") : undeployed !== null && t("undeployed", { count: undeployed })}
      </p>
      <CommitsTable deployed={deployed} />
    </div>
  );
}

export function CommitsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-4 w-72 max-w-full" />
      <Skeleton className="h-[40rem] w-full rounded-xl" />
    </div>
  );
}
