import "server-only";
import { cache } from "react";
import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminDatabaseTable,
  type AdminUploadsAudit,
} from "@kilotrace/shared/admin";
import { DatabaseIcon, FileImageIcon, FileWarningIcon, MapIcon, Trash2Icon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { DataTableSkeleton } from "@kilotrace/ui/components/admin/data-table";
import { KpiGrid, KpiTile, KpiTileSkeleton, shareOf } from "@/components/admin/kpi-tile";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { adminApi } from "@/lib/admin/api";
import { formatBytes } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { deleteOrphans } from "./actions";
import { DatabaseTable } from "./database-table";
import { HeaviestTable, OrphansTable } from "./uploads-tables";

/** Read by the figures and by the table of the page: once per request. */
const databaseTables = cache(() => adminApi<AdminDatabaseTable[]>("/system/database").catch(() => null));

/** Weight of the stored files, read from the storage on every visit: streamed apart. */
export async function UploadsAudit({ canEdit }: { canEdit: boolean }) {
  const t = getAdminTranslations("database.uploads");
  const [result, database] = await Promise.all([adminApi<AdminUploadsAudit>("/system/uploads").catch(() => null), databaseTables()]);
  if (!result?.ok) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>;
  }
  const { avatars, heaviest, orphans, previews } = result.data;
  const common = getAdminTranslations("common");
  const stored = avatars.bytes + orphans.bytes + previews.bytes;

  return (
    <div className="flex flex-col gap-4">
      <KpiGrid columns={4}>
        <DatabaseTile tables={database?.ok ? database.data : null} />
        <KpiTile icon={FileImageIcon} color="blue" label={t("avatars")} value={formatBytes(avatars.bytes)} detail={t("files", { count: avatars.count })} gauge={shareOf(avatars.bytes, stored)} />
        <KpiTile icon={FileWarningIcon} color="aqua" label={t("orphans")} value={formatBytes(orphans.bytes)} detail={t("files", { count: orphans.count })} gauge={shareOf(orphans.bytes, stored)} />
        <KpiTile
          icon={MapIcon}
          color="orange"
          label={t("previews")}
          value={formatBytes(previews.bytes)}
          detail={`${t("files", { count: previews.count })} · ${t("previewsHint")}`}
          gauge={shareOf(previews.bytes, stored)}
        />
      </KpiGrid>

      <Separator />
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t("heaviest")}</h3>
        <HeaviestTable files={heaviest} />
      </div>

      <Separator />
      <div className="flex flex-col gap-2">
        <div>
          <h3 className="text-sm font-medium">{t("orphansTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("orphansDescription")}</p>
        </div>
        <OrphansTable files={orphans.files} />
        {orphans.count > 0 && (
          <>
            {orphans.count > orphans.files.length && (
              <p className="text-xs text-muted-foreground">{t("orphansMore", { count: orphans.count - orphans.files.length })}</p>
            )}
            {canEdit && (
              <div>
                <ActionDialog
                  action={deleteOrphans}
                  trigger={{ label: t("delete.trigger"), icon: <Trash2Icon /> }}
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
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Weight of the rows of the database, indexes included: the free space left by deleted rows aside. */
function DatabaseTile({ tables }: { tables: AdminDatabaseTable[] | null }) {
  const t = getAdminTranslations("database.tables");
  if (!tables) {
    return <KpiTile icon={DatabaseIcon} color="yellow" label={t("weight")} value="—" detail={t("error")} />;
  }
  const sum = (bytes: (table: AdminDatabaseTable) => number) => tables.reduce((total, table) => total + bytes(table), 0);
  const free = sum((table) => table.freeBytes);
  const used = sum((table) => table.totalBytes) - free;
  const indexes = sum((table) => table.indexBytes);
  return (
    <KpiTile
      icon={DatabaseIcon}
      color="yellow"
      label={t("weight")}
      value={formatBytes(used)}
      detail={t("weightDetail", { count: tables.length, indexes: formatBytes(indexes), free: formatBytes(free) })}
      gauge={shareOf(indexes, used)}
    />
  );
}

export function UploadsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <KpiGrid columns={4}>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </KpiGrid>
      <DataTableSkeleton rows={5} />
    </div>
  );
}

/** The tables of the database, read from the catalogs on every visit: streamed apart. */
export async function DatabaseSection() {
  const t = getAdminTranslations("database.tables");
  const result = await databaseTables();
  if (!result?.ok) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("error")}</p>;
  }
  return <DatabaseTable tables={result.data} />;
}

export function DatabaseSkeleton() {
  return <DataTableSkeleton rows={10} />;
}
