import { useTranslations } from "next-intl";
import { FieldSeparator } from "@kilotrace/ui/components/ui/field";
import { GoogleSignInButton } from "./google-sign-in-button";

/** Google button followed by an "or" separator, placed above the email form; alone without it. */
export function GoogleSignIn({ separator = true }: { separator?: boolean }) {
  const t = useTranslations("common");

  return (
    <>
      <GoogleSignInButton className="w-full" />
      {separator && <FieldSeparator>{t("or")}</FieldSeparator>}
    </>
  );
}
