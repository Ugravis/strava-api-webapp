import { getTranslations } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { FieldSeparator } from "@kilotrace/ui/components/ui/field";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { emailSignInEnabled } from "@/lib/system/status";

/**
 * The email form under the Google button, after an "or" separator; nothing
 * while the back office keeps the email sign-in off. Streamed apart, so that
 * the rest of the page stays static.
 */
export function EmailSignInGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <EmailSignIn>{children}</EmailSignIn>
    </Suspense>
  );
}

async function EmailSignIn({ children }: { children: ReactNode }) {
  if (!(await emailSignInEnabled())) return null;
  const t = await getTranslations("common");
  return (
    <>
      <FieldSeparator>{t("or")}</FieldSeparator>
      {children}
    </>
  );
}
