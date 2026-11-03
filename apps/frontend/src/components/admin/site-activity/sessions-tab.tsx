import type { AdminSiteActivitySessions } from "@kilotrace/shared/admin";
import { getAdminTranslations } from "@/lib/admin/messages";
import { PlainBarChart, PlainBarList, PlainLineChart, PlainTable } from "./plain-charts";
import { Section, SectionGrid } from "./section";
import type { SiteActivityFormat } from "./site-activity-format";

export function SessionsTab({ data, format }: { data: AdminSiteActivitySessions; format: SiteActivityFormat }) {
  const t = getAdminTranslations("siteActivity.sessions");
  const empty = <p className="text-sm text-muted-foreground">{getAdminTranslations("siteActivity")("empty")}</p>;

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("hint", { minutes: data.gapMinutes })}</p>
      <SectionGrid>
        <Section title={t("daily")}>
          <PlainLineChart
            labels={data.dates.map(format.day)}
            series={[
              { id: "sessions", label: t("sessions"), color: "blue" },
              { id: "users", label: t("users"), color: "orange" },
            ]}
            values={{ sessions: data.daily.map((day) => day.sessions), users: data.daily.map((day) => day.users) }}
          />
        </Section>

        <Section title={t("lengths")}>
          <PlainBarChart bars={data.lengths.map((row) => ({ label: row.bucket, value: row.sessions }))} />
        </Section>

        <Section title={t("pages")}>
          <PlainBarChart bars={data.pages.map((bin) => ({ label: String(bin.value), value: bin.count }))} color="aqua" />
        </Section>

        <Section title={t("perUser")}>
          <PlainBarChart bars={data.perUser.map((bin) => ({ label: String(bin.value), value: bin.count }))} color="yellow" />
        </Section>

        <Section title={t("entries")}>
          {data.entries.length === 0 ? empty : <PlainBarList bars={data.entries.map((row) => ({ label: row.path, value: row.sessions }))} />}
        </Section>

        <Section title={t("exits")}>
          {data.exits.length === 0 ? empty : <PlainBarList bars={data.exits.map((row) => ({ label: row.path, value: row.sessions }))} color="orange" />}
        </Section>

        <Section title={t("transitions")} wide>
          {data.transitions.length === 0 ? (
            empty
          ) : (
            <PlainTable
              columns={[t("from"), t("to"), t("count")]}
              rows={data.transitions.map((row) => [row.from, <span key="to" className="font-mono text-xs">{row.to}</span>, row.count])}
            />
          )}
        </Section>
      </SectionGrid>
    </>
  );
}
