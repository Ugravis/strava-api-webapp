import { useTranslations } from "next-intl";
import { FieldSeparator } from "@/components/ui/field";
import { GoogleSignInButton } from "./google-sign-in-button";

/** Google button followed by an "or" separator, placed above the email form. */
export function GoogleSignIn() {
  const t = useTranslations("common");

  return (
    <>
      <GoogleSignInButton className="w-full" />
      <FieldSeparator>{t("or")}</FieldSeparator>
    </>
  );
}
