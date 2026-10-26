import Link from "next/link";
import { useTranslations } from "next-intl";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@kilotrace/ui/components/button";
import { routes } from "@/config/routes";
import { TileGrid } from "./tile-grid";

const PATTERN = [
  "##.#....#..##.#.",
  "#.##.#.....#.##.",
  ".#.....#......#.",
];

export function FinalCta() {
  const t = useTranslations("landing");

  return (
    <section aria-labelledby="cta-title" className="px-4 pb-16 sm:pb-24">
      <div className="relative isolate mx-auto flex w-full max-w-6xl flex-col items-center gap-5 overflow-hidden rounded-3xl bg-[#07110b] px-6 py-14 text-center text-white sm:py-20">
        <svg aria-hidden viewBox="0 0 736 136" className="absolute inset-x-0 bottom-0 -z-10 h-auto w-full opacity-25" preserveAspectRatio="xMidYMax slice">
          <TileGrid rows={PATTERN} cell={42} gap={4} emptyClassName="fill-white/[0.04]" opacity={(c, r) => 0.25 + ((c * 7 + r * 3) % 5) / 8} />
        </svg>
        <h2 id="cta-title" className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t("cta.title")}
        </h2>
        <p className="max-w-xl text-pretty text-white/70 sm:text-lg">{t("cta.description")}</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" variant="secondary" className="sm:min-w-44" nativeButton={false} render={<Link href={routes.register} />}>
            {t("start")}
          </Button>
          <GoogleSignInButton className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white sm:min-w-44 dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10">
            {t("withGoogle")}
          </GoogleSignInButton>
        </div>
      </div>
    </section>
  );
}
