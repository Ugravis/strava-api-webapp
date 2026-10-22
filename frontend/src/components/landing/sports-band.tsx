import { BikeIcon, FootprintsIcon, MountainIcon, MountainSnowIcon, PersonStandingIcon, SnowflakeIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const SPORTS: { key: string; icon: LucideIcon }[] = [
  { key: "run", icon: FootprintsIcon },
  { key: "ride", icon: BikeIcon },
  { key: "hike", icon: MountainIcon },
  { key: "walk", icon: PersonStandingIcon },
  { key: "trail", icon: MountainSnowIcon },
  { key: "ski", icon: SnowflakeIcon },
];

export function SportsBand() {
  const t = useTranslations("landing.sports");

  return (
    <section aria-labelledby="sports-title" className="border-t bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 lg:flex-row lg:justify-between">
        <h2 id="sports-title" className="text-sm font-medium text-muted-foreground">
          {t("label")}
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          {SPORTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
