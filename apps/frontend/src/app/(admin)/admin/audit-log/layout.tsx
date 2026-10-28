import { type AdminPage, AUDIT_VISIBILITIES, type AuditLogEntry } from "@kilotrace/shared/admin";
import { EyeIcon, EyeOffIcon, LayersIcon } from "lucide-react";
import { Suspense } from "react";
import { ListNavigationProvider, ListResults } from "@/components/admin/list-navigation";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { AUDIT_DOMAINS } from "./domains";

const VISIBILITY_ICONS = { all: <LayersIcon />, visible: <EyeIcon />, hidden: <EyeOffIcon /> };

/**
 * Header and filters of the logs, kept across the pages of results: only
 * the table changes, a skeleton showing while the next one loads.
 */
export default async function AdminAuditLogLayout({ children }: { children: React.ReactNode }) {
  const { permissions } = await requireAdminMember();
  const t = getAdminTranslations("auditLog");
  const skeleton = <TableSkeleton />;
  return (
    <ListNavigationProvider>
      <PageHeader
        title={t("title")}
        description={
          <>
            {t("description")}{" "}
            <Suspense fallback={null}>
              <EntriesCount />
            </Suspense>
          </>
        }
      />
      <ListToolbar
        basePath={adminRoutes.auditLog}
        search={{ label: t("search") }}
        selects={[
          {
            param: "action",
            label: t("filters.action"),
            options: AUDIT_DOMAINS.map((value) => ({
              value,
              label: t(`filters.domains.${value === "all" ? value : (value.slice(0, -1) as "users" | "usernames" | "roles" | "badges" | "distinctions")}`),
            })),
          },
        ]}
        toggles={
          permissions.includes("audit.hide")
            ? [
                {
                  param: "visibility",
                  label: t("filters.visibility"),
                  options: AUDIT_VISIBILITIES.map((value) => ({
                    value,
                    label: t(`filters.visibilities.${value}`),
                    icon: VISIBILITY_ICONS[value],
                  })),
                },
              ]
            : []
        }
      />
      <Suspense fallback={skeleton}>
        <ListResults skeletons={{ param: "", byValue: { "": skeleton } }}>{children}</ListResults>
      </Suspense>
    </ListNavigationProvider>
  );
}

/** How many entries the role sees, whatever the filters. */
async function EntriesCount() {
  const result = await adminApi<AdminPage<AuditLogEntry>>("/audit-log");
  if (!result.ok) return null;
  return <span className="font-medium text-foreground">{getAdminTranslations("auditLog")("count", { count: result.data.total })}</span>;
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border" aria-busy>
      <Skeleton className="h-9 w-full rounded-none" />
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-t px-3 py-2.5 even:bg-muted/50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-4 w-40" />
        </div>
      ))}
    </div>
  );
}
