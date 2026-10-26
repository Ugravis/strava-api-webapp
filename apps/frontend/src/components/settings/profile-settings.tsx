"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { applyUsernameError } from "@/components/auth/username-errors";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { UsernameField } from "@/components/forms/username-field";
import { Button } from "@kilotrace/ui/components/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@kilotrace/ui/components/input";
import { Textarea } from "@/components/ui/textarea";
import { FamilyIcon } from "@/components/distances/family-icon";
import { ProfileColorPicker } from "@/components/profile/profile-color-picker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCurrentUser } from "@/components/user/user-provider";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import type { FavoriteSport, User } from "@/lib/api/types";
import { profileSchema, type ProfileValues } from "@/lib/validation/schemas";
import { accountService } from "@/services/account.service";
import { CityField } from "./city-field";
import { SettingsSection } from "./settings-section";

const FAVORITE_SPORTS: FavoriteSport[] = ["run", "hike", "ride", "swim"];

const valuesOf = (user: User): ProfileValues => ({
  displayName: user.displayName ?? "",
  username: user.username,
  bio: user.bio ?? "",
  city: user.city ?? "",
  countryCode: user.countryCode,
  favoriteSports: user.favoriteSports,
  profileColor: user.profileColor,
});

export function ProfileSettings() {
  const t = useTranslations();
  const router = useRouter();
  const user = useCurrentUser();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: valuesOf(user),
  });

  async function onSubmit(values: ProfileValues) {
    setErrorCode(null);
    try {
      const updated = await accountService.updateProfile({
        username: values.username,
        displayName: values.displayName || null,
        bio: values.bio || null,
        city: values.city || null,
        countryCode: values.city ? values.countryCode : null,
        favoriteSports: values.favoriteSports,
        profileColor: values.profileColor,
      });
      form.reset(valuesOf(updated));
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
    <SettingsSection id="profile" title={t("settings.profile.title")} description={t("settings.profile.description")}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <FormError code={errorCode} />
          <FormField
            control={form.control}
            name="displayName"
            label={t("fields.displayName")}
            description={t("fields.displayNameDescription")}
          >
            {(field) => (
              <Input {...field} autoComplete="name" placeholder={user.username} maxLength={50} />
            )}
          </FormField>
          <UsernameField
            control={form.control}
            setError={form.setError}
            clearErrors={form.clearErrors}
            currentUsername={user.username}
          />
          <FormField control={form.control} name="bio" label={t("fields.bio")} description={t("fields.bioDescription")}>
            {(field) => <Textarea {...field} rows={3} maxLength={160} placeholder={t("fields.bioPlaceholder")} />}
          </FormField>
          <FormField
            control={form.control}
            name="city"
            label={t("fields.city")}
            description={t("fields.cityDescription")}
          >
            {(field) => (
              <CityField
                id={field.id}
                city={field.value}
                countryCode={form.watch("countryCode")}
                invalid={field["aria-invalid"]}
                onChange={(city, countryCode) => {
                  field.onChange(city);
                  form.setValue("countryCode", countryCode, { shouldDirty: true });
                }}
              />
            )}
          </FormField>
          <FormField control={form.control} name="favoriteSports" label={t("fields.favoriteSports")}>
            {({ value, onChange, id, ...field }) => (
              <ToggleGroup
                id={id}
                multiple
                variant="outline"
                size="sm"
                className="flex-wrap"
                value={value}
                onValueChange={(next) => onChange(FAVORITE_SPORTS.filter((sport) => next.includes(sport)))}
                aria-invalid={field["aria-invalid"]}
              >
                {FAVORITE_SPORTS.map((sport) => (
                  <ToggleGroupItem
                    key={sport}
                    value={sport}
                    className="data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/90"
                  >
                    <FamilyIcon family={sport} aria-hidden />
                    {t(`distances.families.${sport}`)}
                    {value.includes(sport) && <CheckIcon aria-hidden />}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </FormField>
          <FormField control={form.control} name="profileColor" label={t("fields.profileColor")}>
            {({ value, onChange, id }) => <ProfileColorPicker id={id} value={value} onChange={onChange} />}
          </FormField>
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
