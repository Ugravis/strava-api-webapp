"use client";

import { CircleCheckIcon, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FormError } from "@/components/forms/form-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { authService } from "@/services/auth.service";

type VerificationState =
  | { status: "pending" }
  | { status: "verified" }
  | { status: "failed"; code: ApiErrorCode };

export function EmailVerification() {
  const t = useTranslations("auth.verifyEmail");
  const token = useSearchParams().get("token");
  const [state, setState] = useState<VerificationState>(
    token ? { status: "pending" } : { status: "failed", code: "INVALID_TOKEN" },
  );
  // Tokens are single-use: guard against the double effect run in development.
  const submitted = useRef(false);

  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    authService
      .verifyEmail(token)
      .then(() => setState({ status: "verified" }))
      .catch((error: unknown) => setState({ status: "failed", code: errorCodeOf(error) }));
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      {state.status === "pending" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" aria-hidden />
          {t("pending")}
        </p>
      )}
      {state.status === "verified" && (
        <Alert>
          <CircleCheckIcon />
          <AlertDescription>{t("success")}</AlertDescription>
        </Alert>
      )}
      {state.status === "failed" && <FormError code={state.code} />}
      {state.status !== "pending" && (
        <Button size="lg" nativeButton={false} render={<Link href={DEFAULT_AUTHENTICATED_ROUTE} />}>
          {t("continue")}
        </Button>
      )}
    </div>
  );
}
