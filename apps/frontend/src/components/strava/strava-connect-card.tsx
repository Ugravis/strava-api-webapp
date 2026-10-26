import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@kilotrace/ui/components/card";
import type { StravaConnectOrigin } from "@/services/strava.service";
import { StravaConnectButton } from "./strava-connect-button";
import { StravaIcon } from "./strava-icon";

/** Invitation to connect Strava, stating what is imported (consent). */
export function StravaConnectCard({ from }: { from: StravaConnectOrigin }) {
  const t = useTranslations("strava.connectCard");
  const points = [t("imported"), t("noTracks"), t("revocable")];

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#fc4c02]/10 text-[#fc4c02]">
          <StravaIcon className="size-5" />
        </div>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-muted-foreground">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <StravaConnectButton from={from} className="w-full sm:w-auto" />
      </CardFooter>
    </Card>
  );
}
