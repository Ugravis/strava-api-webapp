"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError } from "@/components/ui/field";

interface CheckboxFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
}

/**
 * Boolean form value rendered as a checkbox. The checkbox sits inside its label:
 * Base UI renders it as a non-labelable element, so `htmlFor` would not toggle it.
 */
export function CheckboxField<T extends FieldValues>({ control, name, label }: CheckboxFieldProps<T>) {
  const t = useTranslations("validation");

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {/* Plain label: FieldLabel styles a checked choice as a highlighted card. */}
          <label className="flex w-fit cursor-pointer items-start gap-2 text-sm leading-snug select-none group-data-[invalid=true]/field:text-destructive">
            <Checkbox
              name={field.name}
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
              inputRef={field.ref}
              aria-invalid={fieldState.invalid}
              className="mt-0.5"
            />
            <span>{label}</span>
          </label>
          <FieldError>{fieldState.error?.message && t(fieldState.error.message)}</FieldError>
        </Field>
      )}
    />
  );
}
