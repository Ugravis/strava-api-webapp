import { ArrowUpRightIcon, TableIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";

/** Captures of the POC as validated, before it was extracted into the kit: `public/admin/development/admin-table-poc`, behind the admin check of the proxy. */
const SHOTS = [
  { key: "table", width: 1024, height: 870 },
  { key: "grouped", width: 1024, height: 870 },
  { key: "cards", width: 1024, height: 892 },
  { key: "mobile", width: 358, height: 850 },
] as const;

/** The git tag of the original POC, before the kit. */
const TAG = "admin-table-poc-v1";

/** The prototypes of the back office: the live demo, and how it first looked. */
export function Prototypes() {
  const t = getAdminTranslations("development.prototypes");
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <article className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row">
        <div className="flex flex-col gap-2 md:w-72 md:shrink-0">
          <h3 className="flex items-center gap-2 font-medium">
            <TableIcon className="size-4 text-muted-foreground" aria-hidden />
            {t("adminTable.title")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("adminTable.description")}</p>
          <Button size="sm" className="mt-1 self-start" render={<Link href={adminRoutes.adminTablePoc} />} nativeButton={false}>
            {t("adminTable.live")}
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
          <p className="text-xs text-muted-foreground">{t("adminTable.liveHint")}</p>
          <p className="text-xs text-muted-foreground">
            {t.rich("adminTable.source", { tag: TAG, code: (chunks) => <code className="font-mono">{chunks}</code> })}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">{t("adminTable.original")}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SHOTS.map((shot) => (
              <li key={shot.key}>
                <a
                  href={`/admin/development/admin-table-poc/${shot.key}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col gap-1 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="block aspect-4/3 overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={`/admin/development/admin-table-poc/${shot.key}.png`}
                      alt={t(`adminTable.shots.${shot.key}`)}
                      width={shot.width}
                      height={shot.height}
                      // Read by the browser with its session: the optimizer would meet the 404 of the proxy.
                      unoptimized
                      className="size-full object-cover object-top transition-transform group-hover:scale-[1.02]"
                    />
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">{t(`adminTable.shots.${shot.key}`)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </section>
  );
}
