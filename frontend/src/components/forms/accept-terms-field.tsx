"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Control, FieldValues, Path } from "react-hook-form";
import { routes } from "@/config/routes";
import { CheckboxField } from "./checkbox-field";

/** Mandatory consent to the terms of use; the link opens in a new tab to keep the form. */
export function AcceptTermsField<T extends FieldValues & { acceptTerms: boolean }>({
  control,
}: {
  control: Control<T>;
}) {
  const t = useTranslations("fields");

  return (
    <CheckboxField
      control={control}
      name={"acceptTerms" as Path<T>}
      label={t.rich("acceptTerms", {
        link: (chunks) => (
          <Link
            href={routes.terms}
            target="_blank"
            className="font-medium text-foreground underline underline-offset-4"
          >
            {chunks}
          </Link>
        ),
      })}
    />
  );
}
