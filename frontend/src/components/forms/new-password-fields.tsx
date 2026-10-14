"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import type { NewPasswordValues } from "@/lib/validation/schemas";
import { FormField } from "./form-field";
import { PasswordInput } from "./password-input";

interface NewPasswordFieldsProps {
  control: Control<NewPasswordValues>;
  withCurrentPassword?: boolean;
}

export function NewPasswordFields({ control, withCurrentPassword = false }: NewPasswordFieldsProps) {
  const t = useTranslations("fields");

  return (
    <>
      {withCurrentPassword && (
        <FormField control={control} name="currentPassword" label={t("currentPassword")}>
          {(field) => (
            <PasswordInput {...field} value={field.value ?? ""} autoComplete="current-password" />
          )}
        </FormField>
      )}
      <FormField control={control} name="newPassword" label={t("newPassword")}>
        {(field) => <PasswordInput {...field} autoComplete="new-password" />}
      </FormField>
      <FormField control={control} name="confirmPassword" label={t("confirmPassword")}>
        {(field) => <PasswordInput {...field} autoComplete="new-password" />}
      </FormField>
    </>
  );
}
