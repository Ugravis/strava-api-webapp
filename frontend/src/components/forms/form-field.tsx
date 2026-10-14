"use client";

import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export type FormControlProps<
  T extends FieldValues,
  N extends FieldPath<T> = FieldPath<T>,
> = ControllerRenderProps<T, N> & {
  id: string;
  "aria-invalid": boolean;
};

interface FormFieldProps<T extends FieldValues, N extends FieldPath<T>> {
  control: Control<T>;
  name: N;
  label: ReactNode;
  description?: ReactNode;
  children: (props: FormControlProps<T, N>) => ReactNode;
}

/** Binds a form control to react-hook-form and renders its label, hint and error. */
export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  children,
}: FormFieldProps<T, N>) {
  const t = useTranslations("validation");
  const id = useId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {children({ ...field, id, "aria-invalid": fieldState.invalid })}
          {description && !fieldState.error && (
            <FieldDescription>{description}</FieldDescription>
          )}
          <FieldError>{fieldState.error?.message && t(fieldState.error.message)}</FieldError>
        </Field>
      )}
    />
  );
}
