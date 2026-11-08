import { useTranslations } from "next-intl";
import { buttonVariants } from "@kilotrace/ui/components/ui/button";
import { cn } from "@kilotrace/ui/lib/utils";
import { stravaAuthorizeUrl, type StravaConnectOrigin } from "@/services/strava.service";
import { StravaIcon } from "@kilotrace/ui/components/strava/strava-icon";

interface StravaConnectButtonProps {
  from: StravaConnectOrigin;
  className?: string;
}

/** Full page navigation: the OAuth flow goes through Strava and back. */
export function StravaConnectButton({ from, className }: StravaConnectButtonProps) {
  const t = useTranslations("strava");

  return (
    <a
      href={stravaAuthorizeUrl(from)}
      className={cn(
        buttonVariants({ size: "lg" }),
        "bg-[#fc4c02] text-white hover:bg-[#e34402] focus-visible:ring-[#fc4c02]/40",
        className,
      )}
    >
      <StravaIcon />
      {t("connect")}
    </a>
  );
}
