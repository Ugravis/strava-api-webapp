"use client";

import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/forms/form-error";
import { PasswordInput } from "@/components/forms/password-input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/components/user/user-provider";
import { routes } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { accountService } from "@/services/account.service";
import { SettingsSection } from "./settings-section";

/** Accounts with a password confirm with it, OAuth-only accounts with their username. */
export function DeleteAccountSettings() {
  const t = useTranslations();
  const router = useRouter();
  const { hasPassword, username } = useCurrentUser();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmation("");
      setErrorCode(null);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorCode(null);
    try {
      await accountService.deleteAccount(
        hasPassword ? { password: confirmation } : { usernameConfirmation: confirmation },
      );
      toast.success(t("settings.danger.deleted"));
      router.replace(routes.home);
      router.refresh();
    } catch (error) {
      setErrorCode(errorCodeOf(error));
      setSubmitting(false);
    }
  }

  return (
    <SettingsSection
      title={t("settings.danger.title")}
      description={t("settings.danger.description")}
      destructive
    >
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          <TrashIcon />
          {t("settings.danger.action")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("settings.danger.dialogTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("settings.danger.dialogDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <FormError code={errorCode} />
            <Field>
              <FieldLabel htmlFor={inputId}>
                {hasPassword
                  ? t("settings.danger.confirmWithPassword")
                  : t("settings.danger.confirmWithUsername", { username })}
              </FieldLabel>
              {hasPassword ? (
                <PasswordInput
                  id={inputId}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="current-password"
                />
              ) : (
                <Input
                  id={inputId}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </Field>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>{t("common.cancel")}</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={submitting || confirmation.length === 0}
              >
                {t("settings.danger.confirm")}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
