import type { AdminSiteActivityFunnel } from "@kilotrace/shared/admin";
import { getAdminTranslations } from "@/lib/admin/messages";
import { PlainBarList, PlainTable } from "./plain-charts";
import { Section, SectionGrid } from "./section";
import type { SiteActivityFormat } from "./site-activity-format";

const STEPS = ["signedUp", "stravaConnected", "firstSync", "mapVisited"] as const;

export function FunnelTab({ data, format }: { data: AdminSiteActivityFunnel; format: SiteActivityFormat }) {
  const t = getAdminTranslations("siteActivity.funnel");
  const share = (value: number, total: number) => (total === 0 ? String(value) : `${value} · ${format.percent(value / total)}`);

  return (
    <SectionGrid>
      <Section title={t("title")} hint={t("hint")}>
        <PlainBarList
          bars={STEPS.map((step) => ({ label: t(step), value: data.steps[step] }))}
          format={(value) => share(value, data.steps.signedUp)}
        />
      </Section>

      <Section title={t("median")}>
        <PlainTable
          columns={["", t("median")]}
          rows={(["stravaConnected", "firstSync", "mapVisited"] as const).map((step) => [
            t(step),
            data.medianDays[step] === null ? "—" : t("days", { days: format.number(data.medianDays[step], 1) }),
          ])}
        />
      </Section>

      <Section title={t("cohorts")} wide>
        <PlainTable
          columns={[t("week"), ...STEPS.map((step) => t(step))]}
          rows={data.cohorts.map((cohort) => [cohort.week, ...STEPS.map((step) => share(cohort[step], cohort.signedUp))])}
        />
      </Section>
    </SectionGrid>
  );
}
