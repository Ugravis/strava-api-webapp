import { ArrowUpRightIcon, TableIcon, TrainFrontIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@kilotrace/ui/components/ui/button";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { POC_SHOTS, POC_TAG, pocShotSrc } from "../admin-table/poc-shots";

/** The prototypes of the back office, a card each: one capture, its demo; the others on the demo page. */
export function Prototypes() {
  const t = getAdminTranslations("development.prototypes");
  const cover = POC_SHOTS[0];
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        <li>
          {/* Text on the left, the capture on the right; stacked on a phone, the capture first. */}
          <article className="group/card flex flex-col-reverse overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/25 sm:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <TableIcon className="size-4 text-muted-foreground" aria-hidden />
                {t("adminTable.title")}
              </h3>
              <p className="text-sm text-muted-foreground">{t("adminTable.description")}</p>
              <p className="text-xs text-muted-foreground">
                {t.rich("adminTable.source", { tag: POC_TAG, code: (chunks) => <code className="font-mono">{chunks}</code> })}
              </p>
              <div className="mt-auto flex flex-col items-start gap-1.5 pt-3">
                <Button size="sm" render={<Link href={adminRoutes.adminTablePoc} />} nativeButton={false}>
                  {t("adminTable.live")}
                  <ArrowUpRightIcon data-icon="inline-end" />
                </Button>
                <p className="text-xs text-muted-foreground">{t("adminTable.liveHint")}</p>
              </div>
            </div>
            <div className="aspect-video overflow-hidden border-b bg-muted sm:aspect-auto sm:w-2/5 sm:shrink-0 sm:border-b-0 sm:border-l">
              <Image
                src={pocShotSrc(cover.key)}
                alt={t(`adminTable.shots.${cover.key}`)}
                width={cover.width}
                height={cover.height}
                // Read by the browser with its session: the optimizer would meet the 404 of the proxy.
                unoptimized
                className="size-full object-cover object-top-left transition-transform duration-300 group-hover/card:scale-[1.03]"
              />
            </div>
          </article>
        </li>
        <li>
          <article className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/25">
            <h3 className="flex items-center gap-2 font-medium">
              <TrainFrontIcon className="size-4 text-muted-foreground" aria-hidden />
              {t("stationZones.title")}
            </h3>
            <p className="text-sm text-muted-foreground">{t("stationZones.description")}</p>
            <div className="mt-auto flex flex-col items-start gap-1.5 pt-3">
              <Button size="sm" render={<Link href={adminRoutes.stationZonesPoc} />} nativeButton={false}>
                {t("stationZones.live")}
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
              <p className="text-xs text-muted-foreground">{t("stationZones.liveHint")}</p>
            </div>
          </article>
        </li>
      </ul>
    </section>
  );
}
