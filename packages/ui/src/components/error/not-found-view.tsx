import { HouseIcon } from "lucide-react";
import { AppLink as Link } from "@kilotrace/ui/lib/navigation";
import { useTranslations } from "next-intl";
import type { AppVariant } from "@kilotrace/ui/components/brand/app-logo";
import { Button } from "@kilotrace/ui/components/ui/button";
import { BackButton } from "./back-button";
import { ErrorScene } from "./error-scene";

/** The 404 of an app: a page that does not exist, or that the visitor may not know of. */
export function NotFoundView({ variant, homeHref, embedded }: { variant?: AppVariant; homeHref: string; embedded?: boolean }) {
  const t = useTranslations("errorPages");
  return (
    <ErrorScene
      code="404"
      ghost={1}
      variant={variant}
      homeHref={homeHref}
      embedded={embedded}
      eyebrow={t("notFound.eyebrow")}
      title={t("notFound.title")}
      description={t("notFound.description")}
      actions={
        <>
          <Button size="lg" className="sm:min-w-44" nativeButton={false} render={<Link href={homeHref} />}>
            <HouseIcon data-icon="inline-start" />
            {t("home")}
          </Button>
          <BackButton fallback={homeHref}>{t("back")}</BackButton>
        </>
      }
    />
  );
}
