import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { GridBackdrop } from "@/components/layout/grid-backdrop";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return { title: t("title") };
}

/** Placeholder until the actual terms of use are written. */
export default function TermsPage() {
  const t = useTranslations("terms");

  return (
    <div className="relative isolate flex flex-1 flex-col">
      <GridBackdrop />
      <article className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("placeholder")}</p>
      </article>
    </div>
  );
}
