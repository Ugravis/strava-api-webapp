import Image from "next/image";
import { getAdminTranslations } from "@/lib/admin/messages";

/** Captures of the POC as validated, before it was extracted into the kit: `public/admin/development/admin-table-poc`, behind the admin check of the proxy. */
export const POC_SHOTS = [
  { key: "table", width: 1024, height: 870 },
  { key: "grouped", width: 1024, height: 870 },
  { key: "cards", width: 1024, height: 892 },
  { key: "mobile", width: 358, height: 850 },
] as const;

/** The git tag of the original POC, before the kit. */
export const POC_TAG = "admin-table-poc-v1";

export const pocShotSrc = (key: (typeof POC_SHOTS)[number]["key"]) => `/admin/development/admin-table-poc/${key}.png`;

/** How the POC first looked, under its live demo: each capture opens whole in a tab. */
export function PocShots() {
  const t = getAdminTranslations("development.prototypes.adminTable");
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{t("original")}</h2>
        <p className="text-sm text-muted-foreground">
          {t.rich("source", { tag: POC_TAG, code: (chunks) => <code className="font-mono">{chunks}</code> })}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {POC_SHOTS.map((shot) => (
          <li key={shot.key}>
            <a
              href={pocShotSrc(shot.key)}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col gap-1.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="block aspect-4/3 overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={pocShotSrc(shot.key)}
                  alt={t(`shots.${shot.key}`)}
                  width={shot.width}
                  height={shot.height}
                  // Read by the browser with its session: the optimizer would meet the 404 of the proxy.
                  unoptimized
                  className="size-full object-cover object-top transition-transform group-hover:scale-[1.02]"
                />
              </span>
              <span className="text-xs text-muted-foreground group-hover:text-foreground">{t(`shots.${shot.key}`)}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
