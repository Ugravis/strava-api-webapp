import type { AdminDependencyVersion, AdminDevResponse, AdminMigration } from "@kilotrace/shared/admin";
import { TriangleAlertIcon } from "lucide-react";
import nextPackage from "next/package.json";
import { version as reactVersion } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatRelative } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";

const cell = "px-3 py-2";

/** Libraries of the frontend, read where it runs rather than asked to the backend. */
const FRONTEND_DEPENDENCIES: AdminDependencyVersion[] = [
  { name: "Next.js", version: nextPackage.version },
  { name: "React", version: reactVersion },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t py-2 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  );
}

/** What runs in production: version, commit and last start of the backend. */
export function DeploymentCard({ dev }: { dev: AdminDevResponse }) {
  const t = getAdminTranslations("dev.deployment");
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="text-sm">
          <Row label={t("version")}>
            <span className="tabular-nums">{dev.version}</span>
          </Row>
          <Row label={t("commit")}>
            {dev.commit ? (
              <code className="font-mono text-xs" title={dev.commit}>
                {dev.commit.slice(0, 12)}
              </code>
            ) : (
              <span className="font-normal text-muted-foreground">{t("noCommit")}</span>
            )}
          </Row>
          <Row label={t("environment")}>{dev.environment}</Row>
          <Row label={t("startedAt")}>
            <span title={formatDateTime(dev.startedAt)}>{formatRelative(dev.startedAt)}</span>
          </Row>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Versions of the runtimes, libraries and database servers. */
export function VersionsCard({ dependencies }: { dependencies: AdminDependencyVersion[] }) {
  const t = getAdminTranslations("dev.versions");
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <VersionList label={t("backend")} dependencies={dependencies} />
        <VersionList label={t("frontend")} dependencies={FRONTEND_DEPENDENCIES} />
      </CardContent>
    </Card>
  );
}

function VersionList({ label, dependencies }: { label: string; dependencies: AdminDependencyVersion[] }) {
  const t = getAdminTranslations("dev.versions");
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <dl className="text-sm">
        {dependencies.map((dependency) => (
          <Row key={dependency.name} label={dependency.name}>
            {dependency.version ? (
              <span className="font-mono text-xs">{dependency.version}</span>
            ) : (
              <span className="font-normal text-muted-foreground">{t("unknown")}</span>
            )}
          </Row>
        ))}
      </dl>
    </div>
  );
}

/** Applied migrations, and a warning for those of the code not yet run. */
export function MigrationsSection({ applied, pending }: { applied: AdminMigration[]; pending: AdminMigration[] }) {
  const t = getAdminTranslations("dev.migrations");
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description", { count: applied.length })}</p>
      </div>
      {pending.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t("pending", { count: pending.length })}</p>
            <ul className="mt-1 font-mono text-xs">
              {pending.map((migration) => (
                <li key={migration.name} className="truncate">
                  {migration.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {applied.length > 0 ? <MigrationsTable migrations={applied} /> : <p className="text-sm text-muted-foreground">{t("empty")}</p>}
    </section>
  );
}

function MigrationsTable({ migrations }: { migrations: AdminMigration[] }) {
  const t = getAdminTranslations("dev.migrations.columns");
  return (
    // Every column stays, the table scrolling sideways on narrow screens.
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className={`${cell} w-12 text-right font-medium`}>{t("id")}</th>
            <th className={`${cell} font-medium`}>{t("name")}</th>
            <th className={`${cell} font-medium`}>{t("createdAt")}</th>
          </tr>
        </thead>
        <tbody>
          {migrations.map((migration) => (
            <tr key={migration.name} className="border-t odd:bg-background even:bg-muted/50">
              <td className={`${cell} text-right text-muted-foreground tabular-nums`}>{migration.id}</td>
              <td className={`${cell} max-w-96 truncate font-mono text-xs`} title={migration.name}>
                {migration.name}
              </td>
              <td className={`${cell} text-muted-foreground`}>{formatDateTime(migration.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DevSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
