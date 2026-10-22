import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { routes } from "@/config/routes";
import { serverApiGet } from "@/lib/api/server";
import type { User } from "@/lib/api/types";

/** Current user, or null. Deduplicated within a request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const result = await serverApiGet<User>("/auth/me");
  return result.ok ? result.data : null;
});

/** Current user; an invalid session clears the cookie and goes back to login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(routes.sessionExpired);
  }
  return user;
}
