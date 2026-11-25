"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { VERIFICATION_CODE_TTL_MINUTES, type VerificationChallenge } from "@kilotrace/shared";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { NewPasswordFields } from "@/components/forms/new-password-fields";
import { Button } from "@kilotrace/ui/components/ui/button";
import { FieldGroup } from "@kilotrace/ui/components/ui/field";
import { Input } from "@kilotrace/ui/components/ui/input";
import { routes } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import {
  forgotPasswordSchema,
  newPasswordSchema,
  type ForgotPasswordValues,
  type NewPasswordValues,
} from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";
import { VerificationCodeForm } from "./verification-code-form";

const newPassword = newPasswordSchema(false);

type Step =
  | { name: "email" }
  | { name: "code"; email: string; challenge: VerificationChallenge }
  | { name: "password"; token: string };

/** Email, then the code it receives, then the new password: all on this page. */
export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const tFields = useTranslations("fields");
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "email" });
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const emailForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const passwordForm = useForm<NewPasswordValues>({
    resolver: zodResolver(newPassword),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function requestCode({ email }: ForgotPasswordValues) {
    setErrorCode(null);
    try {
      const challenge = await authService.requestPasswordReset(email);
      setStep({ name: "code", email, challenge });
    } catch (error) {
      setErrorCode(errorCodeOf(error));
    }
  }

  async function verify(challengeId: string, code: string) {
    const { token } = await authService.verifyPasswordReset(challengeId, code);
    setErrorCode(null);
    setStep({ name: "password", token });
  }

  async function resetPassword(token: string, values: NewPasswordValues) {
    setErrorCode(null);
    try {
      await authService.resetPassword(token, values.newPassword);
      toast.success(t("success"));
      router.replace(routes.login);
    } catch (error) {
      const code = errorCodeOf(error);
      setErrorCode(code);
      // Too late to choose it: back to the start for a new code.
      if (code === "INVALID_TOKEN") setStep({ name: "email" });
    }
  }

  if (step.name === "code") {
    return (
      <VerificationCodeForm
        challenge={step.challenge}
        description={t("codeSent", { email: step.email, minutes: VERIFICATION_CODE_TTL_MINUTES })}
        onVerify={verify}
        onBack={() => setStep({ name: "email" })}
        backLabel={t("changeEmail")}
      />
    );
  }

  if (step.name === "password") {
    const { token } = step;
    return (
      <form onSubmit={passwordForm.handleSubmit((values) => resetPassword(token, values))} noValidate>
        <FieldGroup>
          <p className="text-sm text-muted-foreground">{t("newPasswordDescription")}</p>
          <FormError code={errorCode} />
          <NewPasswordFields control={passwordForm.control} />
          <Button type="submit" size="lg" className="w-full" disabled={passwordForm.formState.isSubmitting}>
            {t("savePassword")}
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form onSubmit={emailForm.handleSubmit(requestCode)} noValidate>
      <FieldGroup>
        <FormError code={errorCode} />
        <FormField control={emailForm.control} name="email" label={tFields("email")}>
          {(field) => (
            <Input {...field} type="email" autoComplete="email" inputMode="email" placeholder={tFields("emailPlaceholder")} />
          )}
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={emailForm.formState.isSubmitting}>
          {t("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
