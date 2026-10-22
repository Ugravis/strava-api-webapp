import { BadgeCheckIcon, FlagIcon, GridIcon, HistoryIcon, SquareIcon, TrainFrontIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FeatureCarousel } from "./feature-carousel";
import {
  BadgesIllustration,
  CommunityIllustration,
  CountriesIllustration,
  HistoryIllustration,
  SquareIllustration,
  StationsIllustration,
  TilesIllustration,
} from "./feature-illustrations";

const FEATURES: { key: string; icon: LucideIcon; Illustration: () => React.ReactNode }[] = [
  { key: "tiles", icon: GridIcon, Illustration: TilesIllustration },
  { key: "square", icon: SquareIcon, Illustration: SquareIllustration },
  { key: "countries", icon: FlagIcon, Illustration: CountriesIllustration },
  { key: "stations", icon: TrainFrontIcon, Illustration: StationsIllustration },
  { key: "badges", icon: BadgeCheckIcon, Illustration: BadgesIllustration },
  { key: "history", icon: HistoryIcon, Illustration: HistoryIllustration },
  { key: "community", icon: UsersIcon, Illustration: CommunityIllustration },
];

/** Dark in both themes, like the night side of the map. */
export function Features() {
  const t = useTranslations("landing.features");

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="relative isolate scroll-mt-14 overflow-hidden bg-[#07110b] py-16 text-white sm:py-24"
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60%_100%_at_20%_0%,rgb(22_163_74/0.22),transparent)]" />
      <div className="mx-auto mb-10 flex w-full max-w-6xl flex-col gap-3 px-4">
        <p className="text-sm font-medium text-green-400">{t("eyebrow")}</p>
        <h2 id="features-title" className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t("title")}
        </h2>
        <p className="max-w-xl text-pretty text-white/60 sm:text-lg">{t("subtitle")}</p>
      </div>
      <FeatureCarousel
        slides={FEATURES.map(({ key, icon: Icon, Illustration }) => ({
          id: key,
          content: (
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 bg-black/20 p-5">
                <Illustration />
              </div>
              <div className="flex flex-col gap-2 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Icon className="size-5 text-green-400" aria-hidden />
                  {t(`items.${key}.title`)}
                </h3>
                <p className="text-sm text-pretty text-white/60">{t(`items.${key}.description`)}</p>
              </div>
            </article>
          ),
        }))}
      />
    </section>
  );
}
