import type { AdminBadge, AdminBadgeCatalog } from "@kilotrace/shared/admin";
import { SortableList } from "@/components/admin/sortable-list";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { reorderBadges, reorderThemes } from "./actions";
import { BadgeFormDialog, type BadgeRights, BadgeRow, ThemeFormDialog, ThemeRow } from "./badge-bits";

/**
 * The catalog of badges, by collection: creating, editing (toggling and
 * reordering by drag and drop included) and deleting each need their permission.
 */
export default async function AdminBadgesPage() {
  const { permissions } = await requireAdminMember();
  const rights: BadgeRights = {
    create: permissions.includes("badges.create"),
    edit: permissions.includes("badges.edit"),
    delete: permissions.includes("badges.delete"),
  };
  const t = getAdminTranslations("badges");
  const result = await adminApi<AdminBadgeCatalog>("/badges");
  const { themes, badges } = result.ok ? result.data : { themes: [], badges: [] };

  const inTheme = (id: string | null) => badges.filter((badge) => badge.themeId === id);
  const groups = [
    ...themes.map((theme) => ({ key: theme.id, title: theme.name, badges: inTheme(theme.id) })),
    { key: "", title: t("noTheme"), badges: inTheme(null) },
  ];
  const inactive = badges.filter((badge) => !badge.active).length;
  const handleLabel = t("dragHandle");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={t("title")} description={t("description")} />
        {rights.create && <BadgeFormDialog themes={themes} />}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("themes.title")}</CardTitle>
          <CardDescription>{t("themes.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {themes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("themes.empty")}</p>
          ) : rights.edit ? (
            <SortableList
              action={reorderThemes}
              handleLabel={handleLabel}
              className="divide-y"
              items={themes.map((theme) => ({
                id: theme.id,
                content: <ThemeRow theme={theme} count={inTheme(theme.id).length} rights={rights} />,
              }))}
            />
          ) : (
            <ul className="divide-y">
              {themes.map((theme) => (
                <li key={theme.id}>
                  <ThemeRow theme={theme} count={inTheme(theme.id).length} rights={rights} />
                </li>
              ))}
            </ul>
          )}
          {rights.create && (
            <div>
              <ThemeFormDialog />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: badges.length })} {inactive > 0 && t("inactiveCount", { count: inactive })}
      </p>

      {groups
        .filter((group) => group.key !== "" || group.badges.length > 0)
        .map((group) => (
          <section key={group.key || "none"} className="flex flex-col gap-2">
            <h2 className="flex items-baseline gap-2 text-base font-semibold">
              {group.title}
              <span className="text-xs font-normal text-muted-foreground">{t("count", { count: group.badges.length })}</span>
            </h2>
            {group.badges.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("emptyTheme")}</p>
            ) : (
              <BadgeList badges={group.badges} rights={rights} themes={themes} handleLabel={handleLabel} />
            )}
          </section>
        ))}
    </div>
  );
}

function BadgeList({
  badges,
  rights,
  themes,
  handleLabel,
}: {
  badges: AdminBadge[];
  rights: BadgeRights;
  themes: AdminBadgeCatalog["themes"];
  handleLabel: string;
}) {
  if (!rights.edit) {
    return (
      <ul className="flex flex-col gap-1.5">
        {badges.map((badge) => (
          <li key={badge.id}>
            <BadgeRow badge={badge} themes={themes} rights={rights} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <SortableList
      action={reorderBadges}
      handleLabel={handleLabel}
      className="flex flex-col gap-1.5"
      items={badges.map((badge) => ({ id: badge.id, content: <BadgeRow badge={badge} themes={themes} rights={rights} /> }))}
    />
  );
}
