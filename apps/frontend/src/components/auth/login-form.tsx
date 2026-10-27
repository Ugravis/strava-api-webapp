"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckboxField } from "@/components/forms/checkbox-field";
import { SuspensionNotice } from "@/components/auth/suspension-notice";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { routes, safeRedirectPath } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { loginSchema, type LoginValues } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";

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
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  async function onSubmit(values: LoginValues) {
    setErrorCode(null);
    try {
      await authService.login(values);
      router.replace(safeRedirectPath(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      const code = errorCodeOf(error);
      setSuspended(code === "ACCOUNT_SUSPENDED");
      setErrorCode(code === "ACCOUNT_SUSPENDED" ? null : code);
    }
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
        <FormField control={form.control} name="email" label={t("fields.email")}>
          {(field) => (
            <Input
              {...field}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("fields.emailPlaceholder")}
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
