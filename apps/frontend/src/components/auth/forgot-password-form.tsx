"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { routes } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: ForgotPasswordValues) {
    setErrorCode(null);
    try {
      await authService.requestPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      setErrorCode(errorCodeOf(error));
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <MailCheckIcon />
          <AlertTitle>{t("auth.forgotPassword.sentTitle")}</AlertTitle>
          <AlertDescription>
            {t("auth.forgotPassword.sentDescription", { email: sentTo })}
          </AlertDescription>
        </Alert>
        <Button variant="outline" size="lg" nativeButton={false} render={<Link href={routes.login} />}>
          {t("auth.forgotPassword.backToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
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
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {t("auth.forgotPassword.submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
