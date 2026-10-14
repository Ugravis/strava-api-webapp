import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { FieldSeparator } from "@/components/ui/field";
import { publicApiGet } from "@/lib/api/server";
import type { AuthProviders } from "@/lib/api/types";
import { GOOGLE_SIGN_IN_URL } from "@/services/auth.service";
import { GoogleIcon } from "./google-icon";

/** Google button, rendered only when Google sign-in is configured on the API. */
export async function GoogleSignIn() {
  const [providers, t] = await Promise.all([
    publicApiGet<AuthProviders>("/auth/providers"),
    getTranslations(),
  ]);
  if (!providers?.google) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        nativeButton={false}
        render={<a href={GOOGLE_SIGN_IN_URL} />}
      >
        <GoogleIcon className="size-4" />
        {t("auth.continueWithGoogle")}
      </Button>
      <FieldSeparator>{t("common.or")}</FieldSeparator>
    </>
  );
}
