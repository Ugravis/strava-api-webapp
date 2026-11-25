"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { VERIFICATION_CODE_TTL_MINUTES, type VerificationChallenge } from "@kilotrace/shared";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SuspensionNotice } from "@/components/auth/suspension-notice";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Alert, AlertDescription } from "@kilotrace/ui/components/ui/alert";
import { Button } from "@kilotrace/ui/components/ui/button";
import { FieldGroup } from "@kilotrace/ui/components/ui/field";
import { Input } from "@kilotrace/ui/components/ui/input";
import { routes, safeRedirectPath } from "@/config/routes";
import { ApiError, errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { loginSchema, type LoginValues } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";
import { VerificationCodeForm } from "./verification-code-form";

/** Notices passed in the URL by redirects (OAuth failure, expired session). */
function useRedirectNotice(): string | null {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (error === "google") return t("login.googleError");
  if (error === "google_disabled") return t("login.googleDisabled");
  if (searchParams.has("expired")) return t("sessionExpired");
  return null;
}

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const notice = useRedirectNotice();
  const [suspended, setSuspended] = useState(searchParams.get("error") === "suspended");
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  /** A sign-up left before its code was entered: resumed here. */
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", rememberMe: true },
  });

  function signedIn() {
    router.replace(safeRedirectPath(searchParams.get("next")));
    router.refresh();
  }

  async function onSubmit(values: LoginValues) {
    setErrorCode(null);
    try {
      await authService.login(values);
      signedIn();
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED" && error.challenge) {
        setChallenge(error.challenge);
        return;
      }
      const code = errorCodeOf(error);
      setSuspended(code === "ACCOUNT_SUSPENDED");
      setErrorCode(code === "ACCOUNT_SUSPENDED" ? null : code);
    }
  }

  if (challenge) {
    const identifier = form.getValues("identifier").trim();
    return (
      <VerificationCodeForm
        challenge={challenge}
        description={
          identifier.includes("@")
            ? t("auth.login.unverifiedTo", { email: identifier, minutes: VERIFICATION_CODE_TTL_MINUTES })
            : t("auth.login.unverified", { minutes: VERIFICATION_CODE_TTL_MINUTES })
        }
        onVerify={async (challengeId, code) => {
          await authService.verifySignup(challengeId, code);
          signedIn();
        }}
        onBack={() => setChallenge(null)}
        backLabel={t("auth.forgotPassword.backToLogin")}
      />
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {suspended && <SuspensionNotice />}
        {notice && !errorCode && !suspended && (
          <Alert>
            <CircleAlertIcon />
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
        <FormError code={errorCode} />
        <FormField control={form.control} name="identifier" label={t("fields.identifier")}>
          {(field) => (
            <Input
              {...field}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("fields.identifierPlaceholder")}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="password"
          label={
            <span className="flex w-full items-center justify-between gap-2">
              {t("fields.password")}
              <Link
                href={routes.forgotPassword}
                className="text-sm font-normal text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("auth.login.forgotPassword")}
              </Link>
            </span>
          }
        >
          {(field) => <PasswordInput {...field} autoComplete="current-password" />}
        </FormField>
        <CheckboxField control={form.control} name="rememberMe" label={t("fields.rememberMe")} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {t("auth.login.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
