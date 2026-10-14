"use client";

import { MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorCodeOf } from "@/lib/api/errors";
import { authService } from "@/services/auth.service";

export function EmailVerificationBanner() {
  const t = useTranslations();
  const [sending, setSending] = useState(false);

  async function resend() {
    setSending(true);
    try {
      await authService.resendEmailVerification();
      toast.success(t("emailBanner.sent"));
    } catch (error) {
      toast.error(t(`errors.${errorCodeOf(error)}`));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 border-b bg-muted/50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 text-muted-foreground sm:items-center">
        <MailIcon className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
        {t("emailBanner.message")}
      </p>
      <Button variant="outline" size="sm" onClick={resend} disabled={sending} className="self-start sm:self-auto">
        {t("emailBanner.resend")}
      </Button>
    </div>
  );
}
