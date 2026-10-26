"use client";

import { CircleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ApiErrorCode } from "@/lib/api/errors";

/** Form-level error, translated from an API error code. */
export function FormError({ code }: { code: ApiErrorCode | null }) {
  const t = useTranslations("errors");
  if (!code) {
    return null;
  }
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{t(code)}</AlertDescription>
    </Alert>
  );
}
