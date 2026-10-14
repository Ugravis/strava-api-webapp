"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { applyUsernameError } from "@/components/auth/username-errors";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { UsernameField } from "@/components/forms/username-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/components/user/user-provider";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { profileSchema, type ProfileValues } from "@/lib/validation/schemas";
import { accountService } from "@/services/account.service";
import { SettingsSection } from "./settings-section";

export function ProfileSettings() {
  const t = useTranslations();
  const router = useRouter();
  const user = useCurrentUser();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user.displayName, username: user.username },
  });

  async function onSubmit(values: ProfileValues) {
    setErrorCode(null);
    try {
      const updated = await accountService.updateProfile(values);
      form.reset({ displayName: updated.displayName, username: updated.username });
      toast.success(t("settings.profile.updated"));
      router.refresh();
    } catch (error) {
      const code = errorCodeOf(error);
      if (!applyUsernameError(code, form.setError)) {
        setErrorCode(code);
      }
    }
  }

  return (
    <SettingsSection title={t("settings.profile.title")} description={t("settings.profile.description")}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <FormError code={errorCode} />
          <FormField control={form.control} name="displayName" label={t("fields.displayName")}>
            {(field) => <Input {...field} autoComplete="name" />}
          </FormField>
          <UsernameField
            control={form.control}
            setError={form.setError}
            clearErrors={form.clearErrors}
            currentUsername={user.username}
          />
          <Button
            type="submit"
            className="self-start"
            disabled={!form.formState.isDirty || form.formState.isSubmitting}
          >
            {t("common.save")}
          </Button>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}
