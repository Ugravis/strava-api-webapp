import type { AdminSiteActivityParams } from "@kilotrace/shared/admin";
import { getAdminTranslations } from "@/lib/admin/messages";
import { PlainBarList, PlainTable } from "./plain-charts";
import { Section, SectionGrid } from "./section";
import type { SiteActivityFormat } from "./site-activity-format";

const mono = (text: string) => <span className="font-mono text-xs">{text}</span>;

/** Decoded for reading, as the address bar shows it. */
const readable = (text: string) => {
  try {
    return decodeURIComponent(text.replaceAll("+", " "));
  } catch {
    return text;
  }
};

export function ParamsTab({ data, format }: { data: AdminSiteActivityParams; format: SiteActivityFormat }) {
  const t = getAdminTranslations("siteActivity.params");
  const empty = <p className="text-sm text-muted-foreground">{getAdminTranslations("siteActivity")("empty")}</p>;

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <SectionGrid>
        <Section title={t("keys")} wide>
          {data.keys.length === 0 ? (
            empty
          ) : (
            <div className="flex flex-col gap-4">
              <PlainBarList bars={data.keys.map((row) => ({ label: `${row.path} ? ${row.key}`, value: row.share }))} format={format.percent} />
              <PlainTable
                columns={[t("path"), t("key"), t("views"), t("users"), t("share"), t("visible"), t("distinct")]}
                rows={data.keys.map((row) => [row.path, mono(row.key), row.views, row.users, format.percent(row.share), format.duration(row.visibleMs), row.distinctValues])}
              />
            </div>
          )}
        </Section>

        <Section title={t("values")} wide>
          {data.values.length === 0 ? (
            empty
          ) : (
            <PlainTable
              columns={[t("path"), t("key"), t("value"), t("views"), t("users"), t("visible")]}
              rows={data.values.map((row) => [row.path, mono(row.key), mono(readable(row.value)), row.views, row.users, format.duration(row.visibleMs)])}
            />
          )}
        </Section>

        <Section title={t("queries")} wide>
          {data.queries.length === 0 ? (
            empty
          ) : (
            <PlainTable
              columns={[t("path"), t("query"), t("views"), t("users"), t("visible")]}
              rows={data.queries.map((row) => [
                row.path,
                <span key="query" className="font-mono text-xs break-all">{row.query ? `?${readable(row.query)}` : t("none")}</span>,
                row.views,
                row.users,
                format.duration(row.visibleMs),
              ])}
            />
          )}
        </Section>
      </SectionGrid>
    </>
  );
}
