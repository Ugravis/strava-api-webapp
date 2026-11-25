import { NotFoundView } from "@kilotrace/ui/components/error/not-found-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { routes } from "@/config/routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("errorPages.notFound");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Any unknown address, and every `notFound()`. */
export default function NotFound() {
  return <NotFoundView homeHref={routes.home} />;
}
