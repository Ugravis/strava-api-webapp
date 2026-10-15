"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AcceptTermsField } from "@/components/forms/accept-terms-field";
import { FormError } from "@/components/forms/form-error";
import { UsernameField } from "@/components/forms/username-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_AUTHENTICATED_ROUTE, routes } from "@/config/routes";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import type { PendingGoogleSignup } from "@/lib/api/types";
import { googleSignupSchema, type GoogleSignupValues } from "@/lib/validation/schemas";
import { authService } from "@/services/auth.service";
import { AuthCard } from "./auth-card";
import { applyUsernameError } from "./username-errors";

type PendingState =
  | { status: "loading" }
  | { status: "ready"; pending: PendingGoogleSignup }
  | { status: "error"; code: ApiErrorCode };

/** Last step of a Google sign-up: confirm the name and choose a username. */
export function GoogleSignupForm() {
  const t = useTranslations("auth.googleSignup");
  const [state, setState] = useState<PendingState>({ status: "loading" });

  useEffect(() => {
    authService
      .getPendingGoogleSignup()
      .then((pending) => setState({ status: "ready", pending }))
      .catch((error: unknown) => setState({ status: "error", code: errorCodeOf(error) }));
  }, []);

  if (state.status === "error") {
    return (
      <AuthCard title={t("expiredTitle")}>
        <FormError code={state.code} />
        <Button size="lg" nativeButton={false} render={<Link href={routes.login} />}>
          {t("restart")}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("title")}
      description={
        state.status === "ready" ? t("description", { email: state.pending.email }) : undefined
      }
    >
      {state.status === "loading" ? (
        <div className="flex flex-col gap-4" aria-busy>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : (
        <CompletionForm pending={state.pending} />
      )}
    </AuthCard>
  );
}

function CompletionForm({ pending }: { pending: PendingGoogleSignup }) {
  const tSignup = useTranslations("auth.googleSignup");
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const form = useForm<GoogleSignupValues>({
    resolver: zodResolver(googleSignupSchema),
    defaultValues: { username: pending.suggestedUsername, acceptTerms: false },
  });

  async function onSubmit(values: GoogleSignupValues) {
    setErrorCode(null);
    try {
      await authService.completeGoogleSignup(values);
      router.replace(DEFAULT_AUTHENTICATED_ROUTE);
      router.refresh();
    } catch (error) {
      const code = errorCodeOf(error);
      if (!applyUsernameError(code, form.setError)) {
        setErrorCode(code);
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <FormError code={errorCode} />
        <UsernameField
          control={form.control}
          setError={form.setError}
          clearErrors={form.clearErrors}
        />
        <AcceptTermsField control={form.control} />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {tSignup("submit")}
        </Button>
      </FieldGroup>
    </form>
  );
}
