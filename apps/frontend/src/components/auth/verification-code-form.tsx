"use client";

import { MailCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { VERIFICATION_CODE_LENGTH, type VerificationChallenge } from "@kilotrace/shared";
import { FormError } from "@/components/forms/form-error";
import { Alert, AlertDescription } from "@kilotrace/ui/components/ui/alert";
import { Button } from "@kilotrace/ui/components/ui/button";
import { FieldGroup } from "@kilotrace/ui/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@kilotrace/ui/components/ui/input-otp";
import { useSecondsUntil } from "@/hooks/use-seconds-until";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { authService } from "@/services/auth.service";

const DIGITS_ONLY = "^\\d+$";
/** Past this wait, the daily limit is reached: no countdown, only a notice. */
const LONG_WAIT_SECONDS = 120;

interface VerificationCodeFormProps {
  challenge: VerificationChallenge;
  description: ReactNode;
  /** Checks the code; a thrown API error is shown and the code cleared. */
  onVerify: (challengeId: string, code: string) => Promise<void>;
  onBack: () => void;
  backLabel: string;
}

/**
 * The 6-digit code sent by email, checked as soon as the last digit is typed
 * or pasted. Another code may be asked every 30 seconds: the earlier ones
 * stay valid until they expire.
 */
export function VerificationCodeForm({
  challenge: initialChallenge,
  description,
  onVerify,
  onBack,
  backLabel,
}: VerificationCodeFormProps) {
  const t = useTranslations("auth.verification");
  const [challenge, setChallenge] = useState(initialChallenge);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const secondsLeft = useSecondsUntil(challenge.resendAvailableAt);

  // Back to the input once a wrong code is cleared.
  useEffect(() => {
    if (errorCode && !verifying) inputRef.current?.focus();
  }, [errorCode, verifying]);

  async function verify(value: string) {
    if (verifying) return;
    setVerifying(true);
    setErrorCode(null);
    setResent(false);
    try {
      await onVerify(challenge.challengeId, value);
    } catch (error) {
      setErrorCode(errorCodeOf(error));
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    setErrorCode(null);
    try {
      const next = await authService.resendCode(challenge.challengeId);
      setResent(next.resendAvailableAt !== challenge.resendAvailableAt);
      setChallenge(next);
    } catch (error) {
      setErrorCode(errorCodeOf(error));
    }
    inputRef.current?.focus();
  }

  return (
    <FieldGroup>
      <div className="flex flex-col gap-1.5 text-center">
        <MailCheckIcon className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h2 className="font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <FormError code={errorCode} />
      {resent && !errorCode && (
        <Alert>
          <MailCheckIcon />
          <AlertDescription>{t("resent")}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col items-center gap-2">
        <InputOTP
          ref={inputRef}
          maxLength={VERIFICATION_CODE_LENGTH}
          pattern={DIGITS_ONLY}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={setCode}
          onComplete={(value: string) => void verify(value)}
          aria-label={t("codeLabel")}
          aria-invalid={errorCode ? true : undefined}
        >
          <InputOTPGroup>
            {Array.from({ length: VERIFICATION_CODE_LENGTH }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-11 text-lg sm:size-12"
                aria-invalid={errorCode ? true : undefined}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
          {verifying && t("verifying")}
        </p>
      </div>
      <div className="flex flex-col items-center text-sm">
        {secondsLeft > LONG_WAIT_SECONDS ? (
          <p className="text-muted-foreground">{t("resendLater")}</p>
        ) : (
          <Button type="button" variant="link" size="sm" disabled={secondsLeft > 0} onClick={() => void resend()}>
            {secondsLeft > 0 ? t("resendIn", { seconds: secondsLeft }) : t("resend")}
          </Button>
        )}
      </div>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={onBack}>
        {backLabel}
      </Button>
    </FieldGroup>
  );
}
