import { KpiStrip, KpiStripFigure } from "@/components/admin/kpi-tile";
import { getBusinessFormat } from "@/components/admin/business-statistics/business-format";
import { LineChart } from "@/components/admin/site-activity/line-chart";
import { BarList, ChartHead, CardFigure } from "@/components/admin/site-activity/parts";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { DonutChart } from "@/components/admin/statistics/donut-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { type BusinessView, businessStatistics } from "./data";

const HEIGHT = 220;

/** The links between accounts, what they send each other and the badges they care about. */
export async function CommunityTab({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.community");
  const notificationTypes = getAdminTranslations("businessStatistics.community.notifications.types");
  const [format, data] = await Promise.all([getBusinessFormat(), businessStatistics("community", view.period, view.team)]);
  if (!data) return <DashboardUnavailable />;

  const labels = data.buckets.map((bucket) => format.bucket(data.unit, bucket));
  const titles = data.buckets.map((bucket) => format.bucketTitle(data.unit, bucket));
  const { follows, accounts, badges } = data;
  const growth = [
    { id: "follows", label: t("growth.follows"), color: "blue" as const },
    { id: "likes", label: t("growth.likes"), color: "orange" as const },
  ];
  const followValues = data.growth.map((point) => point.follows);
  const likeValues = data.growth.map((point) => point.likes);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const named = (key: string) => (notificationTypes.has(key as "follow") ? notificationTypes(key as "follow") : key);
  const badgeItems = (items: { id: string; name: string; count: number }[], total?: number) =>
    items.map(({ id, name, count }) => ({
      key: id,
      label: name,
      value: count,
      figure: total ? `${format.number(count)} · ${format.percent(format.ratio(count, total), 0)}` : format.number(count),
    }));

  return (
    <>
      <KpiStrip>
        <KpiStripFigure label={t("strip.follows")} value={format.number(follows.accepted)} detail={t("strip.perAccount", { value: accounts > 0 ? format.number(follows.accepted / accounts, 1) : "–" })} />
        <KpiStripFigure label={t("strip.pending")} value={format.number(follows.pending)} detail={t("strip.pendingDetail", { share: format.percent(format.ratio(follows.accepted, follows.accepted + follows.pending), 0) })} />
        <KpiStripFigure label={t("strip.mutual")} value={format.number(follows.mutualPairs)} detail={t("strip.mutualDetail")} />
        <KpiStripFigure label={t("strip.connected")} value={format.percent(format.ratio(follows.connectedAccounts, accounts), 0)} detail={t("strip.connectedDetail", { count: follows.connectedAccounts, accounts })} />
        <KpiStripFigure
          label={t("strip.likes")}
          value={format.number(data.likes.current)}
          detail={data.likes.previous === null ? t("strip.wholeHistory") : t("strip.previous", { value: format.number(data.likes.previous) })}
        />
      </KpiStrip>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("growth.title")} description={t("growth.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(sum(followValues))} label={t("growth.followsTotal")} />
                  <CardFigure value={format.number(sum(likeValues))} label={t("growth.likesTotal")} />
                </>
              }
              legend={<ChartLegend items={growth} label={t("legend")} />}
            />
            <LineChart labels={labels} titles={titles} series={growth} values={{ follows: followValues, likes: likeValues }} label={t("growth.title")} height={HEIGHT} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("followers.title")} description={t("followers.description")}>
          <BarList
            empty={t("profiles.empty")}
            max={accounts}
            items={data.followers.map(({ bucket, count }) => ({
              key: bucket,
              label: t("followers.bucket", { range: bucket }),
              value: count,
              figure: `${format.number(count)} · ${format.percent(format.ratio(count, accounts), 0)}`,
            }))}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("notifications.title")} description={t("notifications.description")} className="lg:col-span-2">
          {data.notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("notifications.type")}</TableHead>
                    <TableHead className="text-right">{t("notifications.sent")}</TableHead>
                    <TableHead className="text-right">{t("notifications.read")}</TableHead>
                    <TableHead className="text-right">{t("notifications.rate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.notifications.map((row) => (
                    <TableRow key={row.type}>
                      <TableCell className="font-medium">{named(row.type)}</TableCell>
                      <TableCell className="text-right tabular-nums">{format.number(row.sent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{format.number(row.read)}</TableCell>
                      <TableCell className="text-right tabular-nums">{format.percent(format.ratio(row.read, row.sent), 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DashboardCard>
        <DashboardCard title={t("profiles.title")} description={t("profiles.description")}>
          <DonutChart
            label={t("profiles.title")}
            totalLabel={t("profiles.total")}
            emptyLabel={t("profiles.empty")}
            segments={[
              { id: "private", label: t("profiles.private"), value: data.profiles.private, color: "blue" },
              { id: "public", label: t("profiles.public"), value: data.profiles.public, color: "aqua" },
            ]}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("badges.earned")} description={t("badges.earnedDescription", { count: badges.active, athletes: badges.athletes })}>
          <BarList empty={t("badges.empty")} max={badges.athletes} items={badgeItems(badges.earned, badges.athletes)} />
        </DashboardCard>
        <DashboardCard title={t("badges.favorites")} description={t("badges.favoritesDescription")}>
          <BarList color="aqua" empty={t("badges.empty")} items={badgeItems(badges.favorites)} />
        </DashboardCard>
        <DashboardCard title={t("badges.pinned")} description={t("badges.pinnedDescription")}>
          <BarList color="yellow" empty={t("badges.empty")} items={badgeItems(badges.pinned)} />
        </DashboardCard>
      </div>
    </>
  );
}
