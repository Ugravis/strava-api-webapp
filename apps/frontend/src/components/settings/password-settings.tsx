"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/forms/form-error";
import { NewPasswordFields } from "@/components/forms/new-password-fields";
import { Button } from "@kilotrace/ui/components/button";
import { FieldGroup } from "@/components/ui/field";
import { useCurrentUser } from "@/components/user/user-provider";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/validation/schemas";
import { accountService } from "@/services/account.service";
import { SettingsSection } from "./settings-section";

const EMPTY_VALUES: NewPasswordValues = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Changes the password, or defines a first one for OAuth-only accounts. */
export function PasswordSettings() {
  const t = useTranslations("settings.password");
  const router = useRouter();
  const { hasPassword, email } = useCurrentUser();
  const schema = useMemo(() => newPasswordSchema(hasPassword), [hasPassword]);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  async function onSubmit(values: NewPasswordValues) {
    setErrorCode(null);
    try {
      await accountService.changePassword({
        currentPassword: hasPassword ? values.currentPassword : undefined,
        newPassword: values.newPassword,
      });
      form.reset(EMPTY_VALUES);
      toast.success(t("updated"));
      router.refresh();
    } catch (error) {
      const code = errorCodeOf(error);
      if (code === "INVALID_PASSWORD") {
        form.setError("currentPassword", { type: "server", message: "required" });
      }
      setErrorCode(code);
    }
  }

  return (
    <SettingsSection
      title={t("title")}
      description={hasPassword ? t("description") : t("descriptionNoPassword")}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {/* Lets password managers associate the new password with the account. */}
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <FieldGroup>
          <FormError code={errorCode} />
          <NewPasswordFields control={form.control} withCurrentPassword={hasPassword} />
          <Button type="submit" className="self-start" disabled={form.formState.isSubmitting}>
            {hasPassword ? t("submit") : t("submitNoPassword")}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}
