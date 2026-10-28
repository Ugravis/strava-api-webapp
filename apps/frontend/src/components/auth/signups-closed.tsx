import Link from "next/link";
import { useTranslations } from "next-intl";
import { routes } from "@/config/routes";
import { AuthCard } from "./auth-card";

/** In place of the sign-up forms while the back office keeps them closed. */
export function SignupsClosed() {
  const t = useTranslations("auth.register");

  return (
    <AuthCard
      title={t("closedTitle")}
      footer={
        <p>
          {t("hasAccount")}{" "}
          <Link href={routes.login} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      <p className="text-center text-sm text-muted-foreground">{t("closed")}</p>
    </AuthCard>
  );
}
