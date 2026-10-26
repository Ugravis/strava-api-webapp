"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/forms/form-error";
import { NewPasswordFields } from "@/components/forms/new-password-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@kilotrace/ui/components/button";
import { FieldGroup } from "@/components/ui/field";
import { routes } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";

const schema = newPasswordSchema(false);

export function ResetPasswordForm() {
  const t = useTranslations("auth.resetPassword");
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t("missingToken")}</AlertDescription>
      </Alert>
    );
  }

  async function onSubmit(values: NewPasswordValues) {
    if (!token) return;
    setErrorCode(null);
    try {
      await authService.resetPassword(token, values.newPassword);
      toast.success(t("success"));
      router.replace(routes.login);
    } catch (error) {
      setErrorCode(errorCodeOf(error));
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormError code={errorCode} />
        <NewPasswordFields control={form.control} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {t("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
