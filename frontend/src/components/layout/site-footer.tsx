import { cacheLife } from "next/cache";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppLogo } from "@/components/brand/app-logo";
import { StravaIcon } from "@/components/strava/strava-icon";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

const STRAVA_API_POLICY = "https://www.strava.com/legal/api_policy";

const AUTHOR = "Ulysse Pennetier";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

/** Cached so that the footer stays prerendered: the year only changes once a year. */
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
        {links.map(({ label, href, external }) => (
          <li key={href}>
            {external ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                {label}
              </a>
            ) : (
              <Link href={href} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Footer shared by every page. Signed in, the landing page is not reachable (the
 * proxy sends "/" to the dashboard), so its anchors give way to the app sections.
 */
export function SiteFooter({ authenticated = false }: { authenticated?: boolean }) {
  const t = useTranslations("footer");
  const tNavbar = useTranslations("navbar");
  const tNav = useTranslations("nav");

  const columns: { title: string; links: FooterLink[] }[] = authenticated
    ? [
        {
          title: t("app"),
          links: [
            { label: tNav("dashboard"), href: routes.dashboard },
            { label: tNav("map"), href: routes.map },
            { label: tNav("distances"), href: routes.achievements },
          ],
        },
        {
          title: t("account"),
          links: [
            { label: tNav("profiles"), href: routes.profiles },
            { label: tNav("settings"), href: routes.settings },
          ],
        },
      ]
    : [
        {
          title: t("product"),
          links: [
            { label: t("features"), href: routes.features },
            { label: t("steps"), href: routes.howItWorks },
            { label: t("faq"), href: routes.faq },
          ],
        },
        {
          title: t("account"),
          links: [
            { label: tNavbar("login"), href: routes.login },
            { label: tNavbar("register"), href: routes.register },
          ],
        },
      ];

  return (
    <footer aria-label={t("label")} className="border-t bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4 sm:col-span-3 lg:col-span-1">
          <Link href={authenticated ? routes.dashboard : routes.home} className="w-fit">
            <AppLogo />
          </Link>
          <p className="max-w-xs text-sm text-pretty text-muted-foreground">{t("tagline")}</p>
          <p className="text-sm text-muted-foreground">{t("madeBy", { name: AUTHOR })}</p>
        </div>
        {columns.map((column) => (
          <FooterColumn key={column.title} {...column} />
        ))}
        <FooterColumn
          title={t("legal")}
          links={[
            { label: t("terms"), href: routes.terms },
            { label: t("stravaLegal"), href: STRAVA_API_POLICY, external: true },
          ]}
        />
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © <CurrentYear /> {siteConfig.name} · {AUTHOR}. {t("rights")}
          </p>
          <p className="flex items-start gap-1.5 md:items-center">
            <StravaIcon className="mt-px size-3.5 shrink-0 text-[#FC4C02] md:mt-0" />
            <span>
              {t("compatible")}. {t("stravaNotice")}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
