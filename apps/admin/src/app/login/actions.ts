"use server";

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
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    return { error: t("errors.refused") };
  }
  const result = await adminApi<AdminSessionResponse>("/auth/login", "POST", {
    email,
    password,
    rememberMe: formData.get("rememberMe") === "on",
  }).catch(() => null);
  if (!result?.ok) {
    const refused = result?.status === 400 || result?.status === 401;
    return { error: t(refused ? "errors.refused" : "errors.unavailable") };
  }
  await openSession(result.data);
  redirect("/dashboard");
}
