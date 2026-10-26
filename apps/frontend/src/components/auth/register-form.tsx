"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AcceptTermsField } from "@/components/forms/accept-terms-field";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { UsernameField } from "@/components/forms/username-field";
import { Button } from "@kilotrace/ui/components/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@kilotrace/ui/components/input";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { registerSchema, type RegisterValues } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";
import { applyUsernameError } from "./username-errors";

export function RegisterForm() {
  const t = useTranslations("fields");
  const tRegister = useTranslations("auth.register");
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "", acceptTerms: false },
  });

  async function onSubmit(values: RegisterValues) {
    setErrorCode(null);
    try {
      await authService.register(values);
      router.replace(DEFAULT_AUTHENTICATED_ROUTE);
      router.refresh();
    } catch (error) {
      const code = errorCodeOf(error);
      if (!applyUsernameError(code, form.setError)) {
        setErrorCode(code);
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormError code={errorCode} />
        <FormField control={form.control} name="email" label={t("email")}>
          {(field) => (
            <Input
              {...field}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t("emailPlaceholder")}
            />
          )}
        </FormField>
        <UsernameField
          control={form.control}
          setError={form.setError}
          clearErrors={form.clearErrors}
        />
        <FormField control={form.control} name="password" label={t("password")}>
          {(field) => <PasswordInput {...field} autoComplete="new-password" />}
        </FormField>
        <AcceptTermsField control={form.control} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {tRegister("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
