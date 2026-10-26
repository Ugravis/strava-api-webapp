import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { GOOGLE_SIGN_IN_URL } from "@/services/auth.service";
import { GoogleIcon } from "./google-icon";

interface GoogleSignInButtonProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Starts the Google OAuth flow (sign-in and sign-up are the same flow). When
 * Google is not configured, the API redirects back to the login page with a notice.
 */
export function GoogleSignInButton({ className, children }: GoogleSignInButtonProps) {
  const t = useTranslations("auth");

  return (
    <Button
      variant="outline"
      size="lg"
      className={className}
      nativeButton={false}
      render={<a href={GOOGLE_SIGN_IN_URL} />}
    >
      <GoogleIcon className="size-4" />
      {children ?? t("continueWithGoogle")}
    </Button>
  );
}
