"use server";

import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH } from "@kilotrace/shared";
import type { AdminSessionResponse } from "@kilotrace/shared/admin";
import { redirect } from "next/navigation";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { openSession } from "@/lib/admin/session";

export interface LoginState {
  error?: string;
}

/** Email sign-in, while the site has it on: the backend refuses anyone outside the team. */
export async function signInWithPassword(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const t = getAdminTranslations("login");
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  // The rules of the API, checked here too so that a request out of bounds is never sent.
  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    identifier.trim() === "" ||
    identifier.length > EMAIL_MAX_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return { error: t("errors.refused") };
  }
  const result = await adminApi<AdminSessionResponse>("/auth/login", "POST", {
    identifier,
    password,
    rememberMe: formData.get("rememberMe") === "on",
  }).catch(() => null);
  if (!result?.ok) {
    const refused = result?.status === 400 || result?.status === 401 || result?.status === 429;
    return { error: t(refused ? "errors.refused" : "errors.unavailable") };
  }
  await openSession(result.data);
  redirect("/dashboard");
}
