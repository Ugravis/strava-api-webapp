"use client";

import { CheckIcon, LoaderIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useWatch, type Control, type FieldValues, type Path, type UseFormSetError, type UseFormClearErrors } from "react-hook-form";
import { Input } from "@kilotrace/ui/components/input";
import { useUsernameAvailability } from "@/hooks/use-username-availability";
import { FormField } from "./form-field";

interface UsernameFieldProps<T extends FieldValues & { username: string }> {
  control: Control<T>;
  setError: UseFormSetError<T>;
  clearErrors: UseFormClearErrors<T>;
  currentUsername?: string;
}

/** Username input with a live availability check. */
export function UsernameField<T extends FieldValues & { username: string }>({
  control,
  setError,
  clearErrors,
  currentUsername,
}: UsernameFieldProps<T>) {
  const t = useTranslations("fields");
  const name = "username" as Path<T>;
  const value = useWatch({ control, name }) as string;
  const status = useUsernameAvailability(value ?? "", currentUsername);

  useEffect(() => {
    if (status === "taken" || status === "reserved") {
      setError(name, {
        type: "availability",
        message: status === "taken" ? "usernameTaken" : "usernameReserved",
      });
    } else if (status === "available") {
      clearErrors(name);
    }
  }, [status, name, setError, clearErrors]);

  const description =
    status === "checking" ? (
      <span className="inline-flex items-center gap-1">
        <LoaderIcon className="size-3.5 animate-spin" aria-hidden />
        {t("usernameChecking")}
      </span>
    ) : status === "available" ? (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500">
        <CheckIcon className="size-3.5" aria-hidden />
        {t("usernameAvailable")}
      </span>
    ) : (
      t("usernameDescription")
    );

  return (
    <FormField control={control} name={name} label={t("username")} description={description}>
      {(field) => (
        <Input
          {...field}
          onChange={(event) => field.onChange(event.target.value.toLowerCase())}
          placeholder={t("usernamePlaceholder")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
        />
      )}
    </FormField>
  );
}
