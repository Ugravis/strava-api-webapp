import type { AdminSiteActivityParams } from "@kilotrace/shared/admin";
import { BarList, CardFigure, ChartHead, THIN_SCROLL } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { siteActivity, type SiteActivityView } from "./data";

/** Values shown under a parameter, the others counted. */
const VALUES_SHOWN = 12;

/** Keys most used across the pages, in the summary. */
const TOP_KEYS = 8;

type Key = AdminSiteActivityParams["keys"][number];

/** The parameters of the pages, grouped by page, the most viewed first. */
function byPath(keys: Key[]): { path: string; views: number; keys: Key[] }[] {
  const groups = new Map<string, Key[]>();
  for (const key of keys) groups.set(key.path, [...(groups.get(key.path) ?? []), key]);
  return [...groups.entries()]
    .map(([path, entries]) => ({ path, views: Math.max(...entries.map((entry) => entry.views)), keys: entries }))
    .sort((a, b) => b.views - a.views);
}

/** Which tools and states of the pages are used, read from their query strings. */
export async function ParamsTab({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.params");
  const [format, data] = await Promise.all([getSiteActivityFormat(), siteActivity("params", view.days, view.team, view.admin)]);
  if (!data) return <DashboardUnavailable />;
  if (data.keys.length === 0 && data.queries.length === 0) {
    return (
      <DashboardCard title={t("title")}>
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      </DashboardCard>
    );
  }

  const groups = byPath(data.keys);
  const topKeys = [...data.keys].sort((a, b) => b.views - a.views).slice(0, TOP_KEYS);
  const valuesOf = (key: Key) => data.values.filter((value) => value.path === key.path && value.key === key.key);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("summary.title")} description={t("summary.description")}>
          <div className="flex flex-col gap-5">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(groups.length)} label={t("summary.pages")} />
                  <CardFigure value={format.number(data.keys.length)} label={t("summary.keys")} />
                </>
              }
            />
            <BarList
              empty={t("empty")}
              max={1}
              items={topKeys.map((key) => ({
                key: `${key.path}?${key.key}`,
                label: (
                  <span className="font-mono text-xs">
                    <span className="text-muted-foreground">{key.path}</span> <span className="font-medium">{key.key}</span>
                  </span>
                ),
                value: key.share,
                figure: format.percent(key.share, 0),
              }))}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("queries.title")} description={t("queries.description")} className="lg:col-span-2">
          <div className={cn("-mx-2 max-h-96 overflow-x-auto px-2", THIN_SCROLL)}>
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left font-medium">{t("queries.query")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("views")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("users")}</th>
                  <th className="py-2 text-right font-medium">{t("time")}</th>
                </tr>
              </thead>
              <tbody>
                {data.queries.map((query) => (
                  <tr key={`${query.path}?${query.query}`} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="max-w-md py-2 pr-3">
                      <code className="block truncate font-mono text-xs" title={`${query.path}?${query.query}`}>
                        <span className="text-muted-foreground">{query.path}</span>
                        {query.query ? `?${query.query}` : <span className="ml-1.5 font-sans text-muted-foreground italic">{t("queries.none")}</span>}
                      </code>
                    </td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums">{format.number(query.views)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{format.number(query.users)}</td>
                    <td className="py-2 text-right whitespace-nowrap text-muted-foreground tabular-nums">{format.duration(query.visibleMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <DashboardCard key={group.path} title={group.path} description={t("page.description", { count: group.keys.length })} className="[&_[data-slot=card-title]]:font-mono [&_[data-slot=card-title]]:text-sm">
            <ul className="flex flex-col divide-y">
              {group.keys.map((key) => {
                const values = valuesOf(key);
                const hidden = key.distinctValues - Math.min(values.length, VALUES_SHOWN);
                return (
                  <li key={key.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <code className="font-mono text-sm font-medium">{key.key}</code>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {t("page.figures", { views: key.views, users: key.users, time: format.duration(key.visibleMs) })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${Math.min(key.share, 1) * 100}%` }} />
                      </span>
                      <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">{t("page.share", { share: format.percent(key.share, 0) })}</span>
                    </div>
                    {values.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {values.slice(0, VALUES_SHOWN).map((value) => (
                          <span
                            key={value.value}
                            title={t("page.value", { views: value.views, users: value.users, time: format.duration(value.visibleMs) })}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 text-xs"
                          >
                            <code className="truncate font-mono">{value.value || t("page.empty")}</code>
                            <span className="text-muted-foreground tabular-nums">{format.number(value.views)}</span>
                          </span>
                        ))}
                        {hidden > 0 && <span className="px-1 py-0.5 text-xs text-muted-foreground">{t("page.more", { count: hidden })}</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </DashboardCard>
        ))}
      </div>
    </>
  );
}
