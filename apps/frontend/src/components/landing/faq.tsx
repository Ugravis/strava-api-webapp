import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export const FAQ_KEYS = ["what", "tiles", "square", "sources", "sports", "privacy", "mobile", "account"] as const;

/** Native disclosure elements: the answers stay in the HTML for crawlers and work without JavaScript. */
export function Faq() {
  const t = useTranslations("landing");

  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-14 border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("faq.eyebrow")}</p>
          <h2 id="faq-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("faq.title")}
          </h2>
          <p className="text-pretty text-muted-foreground sm:text-lg">{t("faq.description")}</p>
          <div className="mt-4 hidden flex-col items-start gap-3 rounded-2xl border bg-muted/40 p-5 lg:flex">
            <p className="font-semibold">{t("faq.moreTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("faq.moreDescription")}</p>
            <Button nativeButton={false} render={<Link href={routes.register} />}>
              {t("start")}
            </Button>
          </div>
        </div>
        <div className="divide-y border-y">
          {FAQ_KEYS.map((key, index) => (
            <details key={key} className="group" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-left font-medium transition-colors hover:text-foreground/80 sm:text-lg [&::-webkit-details-marker]:hidden">
                <span className="w-6 shrink-0 text-sm text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex-1">{t(`faq.items.${key}.question`)}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform group-open:rotate-45 motion-reduce:transition-none">
                  <PlusIcon className="size-4" aria-hidden />
                </span>
              </summary>
              <p className="pr-12 pb-6 pl-10 text-pretty text-muted-foreground">{t(`faq.items.${key}.answer`)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
