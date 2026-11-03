import type { AdminReleaseNotesOverview } from "@kilotrace/shared/admin";
import { EyeIcon, FilePenIcon, RadioTowerIcon, ReceiptTextIcon } from "lucide-react";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { ReleaseNoteRights } from "./release-note-bits";
import { ReleaseNotesTable } from "./release-notes-table";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/**
 * The figures of the release notes, then one row per release: writing
 * ahead, editing, publishing and deleting each need their permission.
 */
export default async function AdminReleaseNotesPage() {
  const { permissions } = await requireAdminMember();
  const rights: ReleaseNoteRights = {
    create: permissions.includes("releaseNotes.create"),
    edit: permissions.includes("releaseNotes.edit"),
    publish: permissions.includes("releaseNotes.publish"),
    delete: permissions.includes("releaseNotes.delete"),
  };
  const t = getAdminTranslations("releaseNotes");
  const result = await adminApi<AdminReleaseNotesOverview>("/release-notes/overview");
  const overview = result.ok ? result.data : null;
  const latest = overview?.latest;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile icon={RadioTowerIcon} label="En ligne" value={`v${overview.currentVersion}`} detail={`${number.format(overview.releases)} ${overview.releases > 1 ? "versions sorties" : "version sortie"}`} />
          <StatTile
            icon={ReceiptTextIcon}
            label="Notes publiées"
            value={number.format(overview.published)}
            detail={overview.missing > 0 ? `${number.format(overview.missing)} ${overview.missing > 1 ? "versions sorties sans note prête" : "version sortie sans note prête"}` : "Toutes les versions sorties ont leur note"}
          />
          <StatTile icon={FilePenIcon} label="À venir" value={number.format(overview.upcoming)} detail="Notes écrites à l'avance" />
          <StatTile
            icon={EyeIcon}
            label="Lecture"
            value={latest && latest.concerned > 0 ? percent.format(latest.seen / latest.concerned) : "—"}
            detail={latest ? `v${latest.version} : ${number.format(latest.seen)} sur ${number.format(latest.concerned)} concernés` : "Aucune note publiée"}
          />
        </div>
      )}
      <Separator />
      <ReleaseNotesTable rights={rights} currentVersion={overview?.currentVersion ?? "?"} />
    </>
  );
}
